import { describe, expect, it, vi } from 'vitest'
import { productStatus, verifyRegistry, writeOutputsAtomically } from '../lib/image-version-audit.js'
import { EvidenceError } from '../lib/verified-image-sbom.js'

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

  it('omits a missing optional package field rather than marking the image unavailable', async () => {
    const collect = makeCollector(SBOM_MISSING_OPTIONAL)

    const result = await verifyRegistry([REQUIRED_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images[0].status).toBe('verified')
    expect(result.images[0].missingOptional).toContain('gnome')
    expect(result.images[0].values).not.toHaveProperty('gnome')
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
    const allowedKeys = new Set(['id', 'product', 'image', 'required', 'imageDigest', 'sbomDigest', 'status', 'values', 'missingOptional'])
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
      sbom: { packages: [{ name: 'linux', versionInfo: '7.0.7' }] },
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
