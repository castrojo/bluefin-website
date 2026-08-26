import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { projectDakotaVersions } from '../lib/dakota-version-projection.js'
import { IMAGE_SBOM_REGISTRY } from '../lib/image-sbom-registry.js'
import {
  annotateLastSuccessful,
  assertExplainedFieldLoss,
  productStatus,
  verifyRegistry,
  writeOutputsAtomically,
} from '../lib/image-version-audit.js'
import { buildSbomIssuePlan } from '../lib/sbom-issue-report.js'
import { EvidenceError, ToolingError } from '../lib/verified-image-sbom.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const IMAGE_DIGEST = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const SBOM_DIGEST = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

const REQUIRED_RECORD = Object.freeze({
  id: 'dakota',
  product: 'dakota',
  required: true,
  image: 'ghcr.io/projectbluefin/dakota:latest',
  certificateIdentityRegexp: '^https://.*$',
  certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
  packages: {
    kernel: { name: 'linux', required: true },
    gnome: { name: 'gnome-shell', required: false },
  },
})

const OPTIONAL_RECORD = Object.freeze({
  id: 'dakota-gaming',
  product: 'dakota',
  required: false,
  image: 'ghcr.io/projectbluefin/dakota-gaming:latest',
  certificateIdentityRegexp: '^https://.*$',
  certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
  packages: {
    kernel: { name: 'linux', required: true },
  },
})

const SBOM_WITH_ALL = {
  packages: [
    { name: 'linux', versionInfo: '7.0.7' },
    { name: 'gnome-shell', versionInfo: '50.2' },
  ],
}

const SBOM_MISSING_OPTIONAL = {
  packages: [
    { name: 'linux', versionInfo: '7.0.7' },
    // gnome-shell absent
  ],
}

const SBOM_MISSING_REQUIRED = {
  packages: [
    // linux absent
    { name: 'gnome-shell', versionInfo: '50.2' },
  ],
}

function makeCollector(sbom) {
  return vi.fn().mockResolvedValue({
    id: REQUIRED_RECORD.id,
    image: REQUIRED_RECORD.image,
    imageDigest: IMAGE_DIGEST,
    sbomDigest: SBOM_DIGEST,
    checkedAt: '2026-08-26T00:00:00.000Z',
    sbom,
  })
}

// ---------------------------------------------------------------------------
// verifyRegistry
// ---------------------------------------------------------------------------

describe('verifyRegistry — failure policy', () => {
  it('marks a required image unavailable when collectVerifiedImageSbom throws EvidenceError', async () => {
    const err = new EvidenceError('image-not-found', REQUIRED_RECORD.image, 'not found')
    const collect = vi.fn().mockRejectedValue(err)

    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images).toHaveLength(1)
    expect(result.images[0].status).toBe('unavailable')
    expect(result.images[0].id).toBe('dakota')
  })

  it('includes optional image in results when collectVerifiedImageSbom throws EvidenceError', async () => {
    const err = new EvidenceError('missing-sbom', OPTIONAL_RECORD.image, 'no sbom')
    const collect = vi.fn().mockRejectedValue(err)

    const result = await verifyRegistry([OPTIONAL_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images).toHaveLength(1)
    expect(result.images[0].status).toBe('unavailable')
    expect(result.images[0].required).toBe(false)
    expect(result.images[0].errorCode).toBe('missing-sbom')
    expect(result.images[0].error).toBe('no sbom')
  })

  it('aborts (re-throws) when collector throws a non-EvidenceError', async () => {
    const collect = vi.fn().mockRejectedValue(new TypeError('programming mistake'))

    await expect(verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })).rejects.toThrow('programming mistake')
  })

  it('aborts on a ToolingError instead of recording the image as unavailable', async () => {
    const collect = vi.fn().mockRejectedValue(new ToolingError('registry-unavailable', 'oras', 'HTTP 503'))

    await expect(verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect }))
      .rejects
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'registry-unavailable' }))
  })

  it('aborts the whole run when one image hits a tooling failure, publishing nothing', async () => {
    const collect = vi.fn()
      .mockResolvedValueOnce({
        id: REQUIRED_RECORD.id,
        image: REQUIRED_RECORD.image,
        imageDigest: IMAGE_DIGEST,
        sbomDigest: SBOM_DIGEST,
        checkedAt: '2026-08-26T00:00:00.000Z',
        sbom: SBOM_WITH_ALL,
      })
      .mockRejectedValueOnce(new ToolingError('tool-missing', 'cosign', 'cosign is not installed'))

    await expect(verifyRegistry([REQUIRED_RECORD, OPTIONAL_RECORD], { collectVerifiedImageSbom: collect }))
      .rejects
      .toThrow(expect.objectContaining({ name: 'ToolingError' }))
  })

  it('marks an image unavailable when a required package is missing from the SBOM', async () => {
    const collect = makeCollector(SBOM_MISSING_REQUIRED)
    collect.mockResolvedValue({
      id: REQUIRED_RECORD.id,
      image: REQUIRED_RECORD.image,
      imageDigest: IMAGE_DIGEST,
      sbomDigest: SBOM_DIGEST,
      checkedAt: '2026-08-26T00:00:00.000Z',
      sbom: SBOM_MISSING_REQUIRED,
    })

    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images[0].status).toBe('unavailable')
    expect(result.images[0].missingRequired).toContain('kernel')
  })

  it('degrades the image when an optional package is missing, keeping verified values', async () => {
    const collect = makeCollector(SBOM_MISSING_OPTIONAL)

    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images[0].status).toBe('degraded')
    expect(result.images[0].errorCode).toBe('missing-optional')
    expect(result.images[0].missingOptional).toContain('gnome')
    expect(result.images[0].values).toEqual({ kernel: '7.0.7' })
  })

  it('produces verified status when all packages are found', async () => {
    const collect = makeCollector(SBOM_WITH_ALL)

    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images[0].status).toBe('verified')
    expect(result.images[0].values).toEqual({ kernel: '7.0.7', gnome: '50.2' })
    expect(result.images[0].missingOptional).toEqual([])
  })

  it('attempts pendingSbom records and records their EvidenceError', async () => {
    const pending = Object.freeze({ ...REQUIRED_RECORD, pendingSbom: true, packages: {} })
    const err = new EvidenceError('missing-sbom', pending.image, 'no sbom')
    const collect = vi.fn().mockRejectedValue(err)

    const result = await verifyRegistry([pending], { collectVerifiedImageSbom: collect })

    expect(collect).toHaveBeenCalledTimes(1)
    expect(result.images).toHaveLength(1)
    expect(result.images[0].status).toBe('unavailable')
    expect(result.images[0].errorCode).toBe('missing-sbom')
  })

  it('includes checkedAt from the injected now() function', async () => {
    const collect = makeCollector(SBOM_WITH_ALL)
    const now = () => '2026-08-26T00:00:00.000Z'

    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect, now })

    expect(result.checkedAt).toBe('2026-08-26T00:00:00.000Z')
  })

  it('does not carry forward any stale fields from a previous result', async () => {
    const collect = makeCollector(SBOM_WITH_ALL)

    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })
    const image = result.images[0]

    // Only documented keys should be present
    const allowedKeys = new Set([
      'id',
      'product',
      'image',
      'required',
      'imageDigest',
      'sbomDigest',
      'status',
      'fields',
      'values',
      'missingRequired',
      'missingOptional',
      'ambiguousRequired',
      'ambiguousOptional',
      'rejected',
    ])
    for (const key of Object.keys(image)) {
      expect(allowedKeys).toContain(key)
    }
  })

  it('includes product on a verified image entry', async () => {
    const collect = makeCollector(SBOM_WITH_ALL)
    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })
    expect(result.images[0].product).toBe('dakota')
  })

  it('includes product on an unavailable image entry', async () => {
    const err = new EvidenceError('image-not-found', REQUIRED_RECORD.image, 'not found')
    const collect = vi.fn().mockRejectedValue(err)
    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })
    expect(result.images[0].product).toBe('dakota')
    expect(result.images[0].status).toBe('unavailable')
  })
})

// ---------------------------------------------------------------------------
// productStatus
// ---------------------------------------------------------------------------

describe('productStatus', () => {
  it('returns ok when all images are verified', () => {
    const result = {
      checkedAt: '2026-08-26T00:00:00.000Z',
      images: [
        { id: 'dakota', product: 'dakota', status: 'verified' },
        { id: 'dakota-gaming', product: 'dakota', status: 'verified' },
      ],
    }
    const status = productStatus(result)
    expect(status.dakota.status).toBe('ok')
  })

  it('returns unavailable when a required image is unavailable', () => {
    const result = {
      checkedAt: '2026-08-26T00:00:00.000Z',
      images: [
        { id: 'dakota', product: 'dakota', required: true, status: 'verified' },
        { id: 'dakota-gaming', product: 'dakota', required: true, status: 'unavailable' },
      ],
    }
    const status = productStatus(result)
    expect(status.dakota.status).toBe('unavailable')
  })

  it('returns degraded when only optional images are unavailable', () => {
    const result = {
      checkedAt: '2026-08-26T00:00:00.000Z',
      images: [
        { id: 'dakota', product: 'dakota', required: true, status: 'verified' },
        { id: 'dakota-gaming', product: 'dakota', required: false, status: 'unavailable' },
      ],
    }
    const status = productStatus(result)
    expect(status.dakota.status).toBe('degraded')
  })

  it('throws an explicit error when an image entry has no product field', () => {
    const result = {
      checkedAt: '2026-08-26T00:00:00.000Z',
      images: [{ id: 'orphan', status: 'verified' }],
    }
    expect(() => productStatus(result)).toThrow('audit image entry \'orphan\' is missing a product field')
  })

  it('composes directly with verifyRegistry output without caller mutation', async () => {
    const bluefinRecord = Object.freeze({
      id: 'bluefin',
      product: 'bluefin',
      required: true,
      image: 'ghcr.io/projectbluefin/bluefin:latest',
      certificateIdentityRegexp: '^https://.*$',
      certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
      packages: { kernel: { name: 'linux', required: true } },
    })
    const collect = vi.fn().mockResolvedValue({
      id: 'bluefin',
      image: 'ghcr.io/projectbluefin/bluefin:latest',
      imageDigest: IMAGE_DIGEST,
      sbomDigest: SBOM_DIGEST,
      checkedAt: '2026-08-26T00:00:00.000Z',
      sbom: { packages: [{ name: 'linux', versionInfo: '7.0.7' }, { name: 'gnome-shell', versionInfo: '50.2' }] },
    })

    const auditResult = await verifyRegistry(
      [REQUIRED_RECORD, bluefinRecord],
      { collectVerifiedImageSbom: collect, now: () => '2026-08-26T00:00:00.000Z' },
    )

    // Must not mutate entries before calling productStatus
    const imageCopies = auditResult.images.map(i => ({ ...i }))
    const status = productStatus(auditResult)

    expect(status.dakota.status).toBe('ok')
    expect(status.bluefin.status).toBe('ok')
    // Verify original entries were not mutated
    expect(auditResult.images).toEqual(imageCopies)
  })
})

// ---------------------------------------------------------------------------
// writeOutputsAtomically
// ---------------------------------------------------------------------------

describe('writeOutputsAtomically', () => {
  it('writes a JSON file to the destination root', () => {
    const written = {}
    const renamed = {}
    const fsMock = {
      mkdirSync: vi.fn(),
      mkdtempSync: vi.fn().mockReturnValue('/dest/.tmp-abc'),
      writeFileSync: vi.fn((p, content) => { written[p] = content }),
      renameSync: vi.fn((src, dst) => { renamed[dst] = written[src] }),
      rmSync: vi.fn(),
    }
    const audit = { checkedAt: '2026-08-26T00:00:00.000Z', images: [] }

    writeOutputsAtomically({ 'sbom-audit.json': audit }, '/dest', { fs: fsMock })

    expect(fsMock.mkdirSync).toHaveBeenCalledWith('/dest', { recursive: true })
    // Temp dir must be created inside destinationRoot, not os.tmpdir()
    const mkdtempArg = (fsMock.mkdtempSync as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(mkdtempArg).toMatch(/^\/dest[/\\]/)
    expect(fsMock.renameSync).toHaveBeenCalledWith(
      '/dest/.tmp-abc/sbom-audit.json',
      '/dest/sbom-audit.json',
    )
    const content = JSON.parse(renamed['/dest/sbom-audit.json'])
    expect(content.checkedAt).toBe('2026-08-26T00:00:00.000Z')
  })

  it('leaves existing files unchanged if validation throws', () => {
    const fsMock = {
      mkdirSync: vi.fn(),
      mkdtempSync: vi.fn().mockReturnValue('/dest/.tmp-abc'),
      writeFileSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
    }
    const validate = vi.fn().mockImplementation(() => {
      throw new Error('invalid')
    })

    expect(() => writeOutputsAtomically({ 'sbom-audit.json': {} }, '/dest', { fs: fsMock, validate })).toThrow('invalid')
    // renameSync must never have been called
    expect(fsMock.renameSync).not.toHaveBeenCalled()
    // writeFileSync must never have been called (validation ran first)
    expect(fsMock.writeFileSync).not.toHaveBeenCalled()
  })

  it('cleans up only the staging subdirectory after a write error', () => {
    const fsMock = {
      mkdirSync: vi.fn(),
      mkdtempSync: vi.fn().mockReturnValue('/dest/.tmp-abc'),
      writeFileSync: vi.fn().mockImplementation(() => { throw new Error('disk full') }),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
    }

    expect(() => writeOutputsAtomically({ 'sbom-audit.json': {} }, '/dest', { fs: fsMock })).toThrow('disk full')
    // Must clean only the staging subdir, not destinationRoot
    expect(fsMock.rmSync).toHaveBeenCalledWith('/dest/.tmp-abc', { recursive: true, force: true })
    expect(fsMock.rmSync).not.toHaveBeenCalledWith('/dest', expect.anything())
  })
})

// ---------------------------------------------------------------------------
// --check-only semantics
// ---------------------------------------------------------------------------

describe('--check-only semantics (productStatus + verifyRegistry)', () => {
  it('has nonzero unavailable count when a required image fails', async () => {
    const err = new EvidenceError('image-not-found', REQUIRED_RECORD.image, 'not found')
    const collect = vi.fn().mockRejectedValue(err)

    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })
    const unavailable = result.images.filter(img => img.status === 'unavailable')

    expect(unavailable.length).toBeGreaterThan(0)
  })

  it('has nonzero unavailable count when only optional images fail (now included)', async () => {
    const err = new EvidenceError('missing-sbom', OPTIONAL_RECORD.image, 'no sbom')
    const collect = vi.fn().mockRejectedValue(err)

    const result = await verifyRegistry([OPTIONAL_RECORD], { collectVerifiedImageSbom: collect })
    const unavailable = result.images.filter(img => img.status === 'unavailable')

    // Optional failures are now included so --check-only exits nonzero
    expect(unavailable.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Ambiguity and rejection audit (fail-closed)
// ---------------------------------------------------------------------------

const AMBIGUOUS_RECORD = Object.freeze({
  id: 'dakota',
  product: 'dakota',
  required: true,
  image: 'ghcr.io/projectbluefin/dakota:latest',
  certificateIdentityRegexp: '^https://.*$',
  certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
  packages: {
    kernel: { name: 'linux', required: true },
    mesa: { name: 'mesa', required: false },
  },
})

function collectorFor(record, sbom) {
  return vi.fn().mockResolvedValue({
    id: record.id,
    image: record.image,
    imageDigest: IMAGE_DIGEST,
    sbomDigest: SBOM_DIGEST,
    checkedAt: '2026-08-26T00:00:00.000Z',
    sbom,
  })
}

describe('verifyRegistry — ambiguity is fail-closed', () => {
  it('marks the image unavailable when a required field is ambiguous', async () => {
    const collect = collectorFor(AMBIGUOUS_RECORD, {
      packages: [
        { name: 'linux', versionInfo: '7.0.7' },
        { name: 'linux', versionInfo: '6.12.40' },
        { name: 'mesa', versionInfo: '26.0.6' },
      ],
    })

    const result = await verifyRegistry([AMBIGUOUS_RECORD], { collectVerifiedImageSbom: collect })
    const image = result.images[0]

    expect(image.status).toBe('unavailable')
    expect(image.errorCode).toBe('ambiguous-required')
    expect(image.ambiguousRequired).toEqual(['kernel'])
    // Never expose partially verified values from an unavailable required image
    expect(image).not.toHaveProperty('values')
  })

  it('degrades the image when only an optional field is ambiguous, retaining verified values', async () => {
    const collect = collectorFor(AMBIGUOUS_RECORD, {
      packages: [
        { name: 'linux', versionInfo: '7.0.7' },
        { name: 'mesa', versionInfo: '26.1.4-4.fc44' },
        { name: 'mesa', versionInfo: '26.1.5-1.fc44' },
      ],
    })

    const result = await verifyRegistry([AMBIGUOUS_RECORD], { collectVerifiedImageSbom: collect })
    const image = result.images[0]

    expect(image.status).toBe('degraded')
    expect(image.errorCode).toBe('ambiguous-optional')
    expect(image.ambiguousOptional).toEqual(['mesa'])
    expect(image.values).toEqual({ kernel: '7.0.7' })
    expect(image.values).not.toHaveProperty('mesa')
  })

  it('records rejected commit hashes without failing a field that has one accepted value', async () => {
    const collect = collectorFor(AMBIGUOUS_RECORD, {
      packages: [
        { name: 'linux', versionInfo: '7.0.7' },
        { name: 'linux', versionInfo: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
        { name: 'mesa', versionInfo: '26.0.6' },
      ],
    })

    const result = await verifyRegistry([AMBIGUOUS_RECORD], { collectVerifiedImageSbom: collect })
    const image = result.images[0]

    expect(image.status).toBe('verified')
    expect(image.values).toEqual({ kernel: '7.0.7', mesa: '26.0.6' })
    expect(image.rejected).toEqual([
      { field: 'kernel', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    ])
  })

  it('carries the mapped field list onto every entry for the field-loss guard', async () => {
    const collect = collectorFor(AMBIGUOUS_RECORD, {
      packages: [{ name: 'linux', versionInfo: '7.0.7' }, { name: 'mesa', versionInfo: '26.0.6' }],
    })

    const result = await verifyRegistry([AMBIGUOUS_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images[0].fields).toEqual(['kernel', 'mesa'])
  })

  it('carries the mapped field list onto an evidence-failure entry', async () => {
    const err = new EvidenceError('image-not-found', AMBIGUOUS_RECORD.image, 'not found')
    const collect = vi.fn().mockRejectedValue(err)

    const result = await verifyRegistry([AMBIGUOUS_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images[0].fields).toEqual(['kernel', 'mesa'])
    expect(result.images[0].errorCode).toBe('image-not-found')
  })

  it('prefers the missing-required error code when a field is both missing and another ambiguous', async () => {
    const collect = collectorFor(AMBIGUOUS_RECORD, {
      packages: [
        { name: 'mesa', versionInfo: '26.0.6' },
      ],
    })

    const result = await verifyRegistry([AMBIGUOUS_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images[0].status).toBe('unavailable')
    expect(result.images[0].errorCode).toBe('missing-required')
    expect(result.images[0].missingRequired).toEqual(['kernel'])
  })
})

// ---------------------------------------------------------------------------
// Pending mappings
// ---------------------------------------------------------------------------

describe('verifyRegistry — pending mappings never verify', () => {
  const PENDING_RECORD = Object.freeze({
    id: 'dakota-gaming',
    product: 'dakota',
    required: false,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/dakota-gaming:testing',
    certificateIdentityRegexp: '^https://.*$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  })

  it('stays unavailable with pending-mapping once an SPDX referrer appears', async () => {
    const collect = collectorFor(PENDING_RECORD, {
      packages: [{ name: 'linux', versionInfo: '7.1.8-ogc1' }],
    })

    const result = await verifyRegistry([PENDING_RECORD], { collectVerifiedImageSbom: collect })
    const image = result.images[0]

    expect(image.status).toBe('unavailable')
    expect(image.errorCode).toBe('pending-mapping')
    // Digests are retained for diagnosis
    expect(image.imageDigest).toBe(IMAGE_DIGEST)
    expect(image.sbomDigest).toBe(SBOM_DIGEST)
    expect(image).not.toHaveProperty('values')
  })

  it('treats an empty packages map as pending even without the pendingSbom flag', async () => {
    const record = Object.freeze({ ...PENDING_RECORD, pendingSbom: undefined, packages: {} })
    const collect = collectorFor(record, { packages: [{ name: 'linux', versionInfo: '7.1.8-ogc1' }] })

    const result = await verifyRegistry([record], { collectVerifiedImageSbom: collect })

    expect(result.images[0].status).toBe('unavailable')
    expect(result.images[0].errorCode).toBe('pending-mapping')
  })

  it('keeps the collector evidence error when the pending image still has no SBOM', async () => {
    const err = new EvidenceError('missing-sbom', PENDING_RECORD.image, 'no sbom')
    const collect = vi.fn().mockRejectedValue(err)

    const result = await verifyRegistry([PENDING_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images[0].status).toBe('unavailable')
    expect(result.images[0].errorCode).toBe('missing-sbom')
  })
})

// ---------------------------------------------------------------------------
// productStatus with degraded entries
// ---------------------------------------------------------------------------

describe('productStatus — degraded entries', () => {
  it('reports degraded when an image is degraded', () => {
    const status = productStatus({
      checkedAt: '2026-08-26T00:00:00.000Z',
      images: [
        { id: 'bluefin-stable', product: 'bluefin', required: true, status: 'degraded' },
        { id: 'bluefin-stable-nvidia', product: 'bluefin', required: false, status: 'verified' },
      ],
    })
    expect(status.bluefin.status).toBe('degraded')
  })

  it('still reports unavailable when a required image failed alongside a degraded one', () => {
    const status = productStatus({
      checkedAt: '2026-08-26T00:00:00.000Z',
      images: [
        { id: 'bluefin-stable', product: 'bluefin', required: true, status: 'degraded' },
        { id: 'bluefin-lts', product: 'bluefin', required: true, status: 'unavailable' },
      ],
    })
    expect(status.bluefin.status).toBe('unavailable')
  })
})

// ---------------------------------------------------------------------------
// annotateLastSuccessful
// ---------------------------------------------------------------------------

describe('annotateLastSuccessful', () => {
  const previous = {
    checkedAt: '2026-08-25T10:00:00.000Z',
    images: [
      { id: 'dakota', product: 'dakota', status: 'verified' },
      { id: 'bluefin-stable', product: 'bluefin', status: 'degraded' },
      { id: 'bluefin-lts', product: 'bluefin', status: 'unavailable' },
    ],
  }

  it('copies the previous run timestamp onto a newly failed image', () => {
    const current = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{ id: 'dakota', product: 'dakota', status: 'unavailable', errorCode: 'missing-sbom' }],
    }
    const annotated = annotateLastSuccessful(current, previous)
    expect(annotated.images[0].lastSuccessfulAt).toBe('2026-08-25T10:00:00.000Z')
  })

  it('accepts a previously degraded image as a last successful verification', () => {
    const current = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{ id: 'bluefin-stable', product: 'bluefin', status: 'unavailable', errorCode: 'missing-sbom' }],
    }
    const annotated = annotateLastSuccessful(current, previous)
    expect(annotated.images[0].lastSuccessfulAt).toBe('2026-08-25T10:00:00.000Z')
  })

  it('preserves lastSuccessfulAt across consecutive failed runs', () => {
    const previousFailure = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{
        id: 'dakota',
        product: 'dakota',
        status: 'unavailable',
        errorCode: 'missing-sbom',
        lastSuccessfulAt: '2026-08-25T10:00:00.000Z',
      }],
    }
    const current = {
      checkedAt: '2026-08-27T10:00:00.000Z',
      images: [{ id: 'dakota', product: 'dakota', status: 'unavailable', errorCode: 'missing-sbom' }],
    }

    const annotated = annotateLastSuccessful(current, previousFailure)

    expect(annotated.images[0].lastSuccessfulAt).toBe('2026-08-25T10:00:00.000Z')
  })

  it('records nothing when the previous run never verified that image', () => {
    const current = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{ id: 'bluefin-lts', product: 'bluefin', status: 'unavailable', errorCode: 'pending-mapping' }],
    }
    const annotated = annotateLastSuccessful(current, previous)
    expect(annotated.images[0]).not.toHaveProperty('lastSuccessfulAt')
  })

  it('annotates degraded entries too', () => {
    const current = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{ id: 'dakota', product: 'dakota', status: 'degraded', errorCode: 'ambiguous-optional' }],
    }
    const annotated = annotateLastSuccessful(current, previous)
    expect(annotated.images[0].lastSuccessfulAt).toBe('2026-08-25T10:00:00.000Z')
  })

  it('leaves verified entries untouched and does not mutate the input', () => {
    const current = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{ id: 'dakota', product: 'dakota', status: 'verified' }],
    }
    const annotated = annotateLastSuccessful(current, previous)
    expect(annotated.images[0]).not.toHaveProperty('lastSuccessfulAt')
    expect(current.images[0]).not.toHaveProperty('lastSuccessfulAt')
  })

  it('is a no-op without a previous audit', () => {
    const current = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{ id: 'dakota', product: 'dakota', status: 'unavailable' }],
    }
    expect(annotateLastSuccessful(current, null).images[0]).not.toHaveProperty('lastSuccessfulAt')
  })
})

// ---------------------------------------------------------------------------
// Explained field-loss guard
// ---------------------------------------------------------------------------

describe('assertExplainedFieldLoss', () => {
  const audit = {
    checkedAt: '2026-08-26T10:00:00.000Z',
    images: [
      {
        id: 'bluefin-stable',
        product: 'bluefin',
        required: true,
        status: 'degraded',
        errorCode: 'ambiguous-optional',
        fields: ['base', 'kernel', 'gnome', 'mesa'],
        values: { base: 'Fedora 44', kernel: '7.1.6-201', gnome: '50.3-1' },
        ambiguousOptional: ['mesa'],
        missingOptional: [],
      },
    ],
  }

  it('accepts a field removed because it is ambiguous in this run', () => {
    expect(() => assertExplainedFieldLoss({
      label: 'stream-versions.yml stable',
      product: 'bluefin',
      previous: { kernel: '7.1.5-200', mesa: '26.1.4-4' },
      next: { kernel: '7.1.6-201' },
      audit,
    })).not.toThrow()
  })

  it('throws when a field disappears with no matching evidence', () => {
    expect(() => assertExplainedFieldLoss({
      label: 'stream-versions.yml stable',
      product: 'bluefin',
      previous: { kernel: '7.1.5-200', gnome: '50.3-1' },
      next: { kernel: '7.1.6-201' },
      audit,
    })).toThrow(/unexplained field loss/i)
  })

  it('names the unexplained fields and the output it guards', () => {
    expect(() => assertExplainedFieldLoss({
      label: 'stream-versions.yml stable',
      product: 'bluefin',
      previous: { gnome: '50.3-1', pipewire: '1.6.8-1' },
      next: {},
      audit,
    })).toThrow(/stream-versions\.yml stable.*gnome, pipewire/s)
  })

  it('accepts loss explained by an unavailable image that mapped the field', () => {
    const unavailableAudit = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{
        id: 'dakota-nvidia',
        product: 'dakota',
        required: false,
        status: 'unavailable',
        errorCode: 'image-not-found',
        fields: ['nvidia'],
      }],
    }
    expect(() => assertExplainedFieldLoss({
      label: 'dakota-versions.json packages',
      product: 'dakota',
      previous: { nvidia: '595.71.05' },
      next: {},
      audit: unavailableAudit,
    })).not.toThrow()
  })

  it('ignores non-SBOM metadata keys', () => {
    expect(() => assertExplainedFieldLoss({
      label: 'dakota-versions.json packages',
      product: 'dakota',
      previous: { baseline: 'x86-64-v3' },
      next: {},
      audit: { checkedAt: '2026-08-26T10:00:00.000Z', images: [] },
      ignore: ['baseline'],
    })).not.toThrow()
  })

  it('accepts an entire block going unavailable when the product has an unavailable image', () => {
    const unavailableAudit = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{ id: 'bluefin-lts', product: 'bluefin', required: true, status: 'unavailable', errorCode: 'pending-mapping', fields: [] }],
    }
    expect(() => assertExplainedFieldLoss({
      label: 'stream-versions.yml lts',
      product: 'bluefin',
      previous: { status: 'verified', kernel: '6.12.40', gnome: '48.1' },
      next: { status: 'unavailable' },
      audit: unavailableAudit,
    })).not.toThrow()
  })

  it('accepts a Dakota packages block going unavailable when its required image fails', () => {
    const unavailableAudit = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [
        {
          id: 'dakota',
          product: 'dakota',
          required: true,
          status: 'unavailable',
          errorCode: 'missing-sbom',
          fields: ['kernel', 'gnome', 'mesa'],
        },
        {
          id: 'dakota-nvidia',
          product: 'dakota',
          required: false,
          status: 'verified',
          fields: ['nvidia'],
          values: { nvidia: '595.71.05' },
        },
      ],
    }
    const projected = projectDakotaVersions(unavailableAudit, { baseline: 'x86-64-v3' })

    expect(projected.status).toBe('unavailable')
    expect(() => assertExplainedFieldLoss({
      label: 'dakota-versions.json packages',
      product: 'dakota',
      previous: { kernel: '7.0.7', nvidia: '595.71.05', baseline: 'x86-64-v3' },
      next: projected.packages,
      nextStatus: projected.status,
      audit: unavailableAudit,
      ignore: ['baseline'],
    })).not.toThrow()
  })

  it('resolves the hwe alias to the kernel field of the HWE image', () => {
    const unavailableAudit = {
      checkedAt: '2026-08-26T10:00:00.000Z',
      images: [{ id: 'bluefin-lts-hwe', product: 'bluefin', required: false, status: 'unavailable', errorCode: 'missing-sbom', fields: ['kernel'] }],
    }
    expect(() => assertExplainedFieldLoss({
      label: 'stream-versions.yml lts',
      product: 'bluefin',
      previous: { hwe: '6.17.1' },
      next: {},
      audit: unavailableAudit,
      aliases: { hwe: 'kernel' },
    })).not.toThrow()
  })

  it('does not treat another product\'s evidence as an explanation', () => {
    expect(() => assertExplainedFieldLoss({
      label: 'dakota-versions.json packages',
      product: 'dakota',
      previous: { mesa: '26.0.6' },
      next: {},
      audit,
    })).toThrow(/unexplained field loss/i)
  })
})

// ---------------------------------------------------------------------------
// Registry-level regression: a pending image that starts publishing an SBOM
// ---------------------------------------------------------------------------

describe('registry records awaiting a package mapping', () => {
  const gamingOgcSbom = JSON.parse(
    readFileSync(join(import.meta.dirname, 'fixtures/dakota-gaming-ogc.spdx.json'), 'utf8'),
  )

  it('keeps every pendingSbom registry record unavailable once its SBOM appears', async () => {
    const pendingRecords = IMAGE_SBOM_REGISTRY.filter(record => record.pendingSbom === true)
    expect(pendingRecords.length).toBeGreaterThan(0)

    const collect = vi.fn().mockImplementation(async record => ({
      id: record.id,
      image: record.image,
      imageDigest: IMAGE_DIGEST,
      sbomDigest: SBOM_DIGEST,
      checkedAt: '2026-08-26T00:00:00.000Z',
      sbom: gamingOgcSbom,
    }))

    const result = await verifyRegistry(pendingRecords, { collectVerifiedImageSbom: collect })

    for (const image of result.images) {
      expect(image.status, `${image.id} must not verify without a reviewed mapping`).toBe('unavailable')
      expect(image.errorCode).toBe('pending-mapping')
      expect(image).not.toHaveProperty('values')
      expect(image.imageDigest).toBe(IMAGE_DIGEST)
    }
  })

  it('does not let a pending LTS record mark the Bluefin LTS stream verified', async () => {
    const ltsRecord = IMAGE_SBOM_REGISTRY.find(record => record.id === 'bluefin-lts')!
    const collect = vi.fn().mockResolvedValue({
      id: ltsRecord.id,
      image: ltsRecord.image,
      imageDigest: IMAGE_DIGEST,
      sbomDigest: SBOM_DIGEST,
      checkedAt: '2026-08-26T00:00:00.000Z',
      sbom: gamingOgcSbom,
    })

    const result = await verifyRegistry([ltsRecord], { collectVerifiedImageSbom: collect })
    const plan = buildSbomIssuePlan(result, [])

    expect(result.images[0].status).toBe('unavailable')
    expect(plan.close).toHaveLength(0)
    expect(plan.create.map(issue => issue.title)).toEqual(['[SBOM verification] bluefin: pending-mapping'])
  })
})
