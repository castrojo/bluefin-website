import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyRegistry, productStatus, writeOutputsAtomically } from '../lib/image-version-audit.js'
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

  it('omits an optional image entirely when collectVerifiedImageSbom throws EvidenceError', async () => {
    const err = new EvidenceError('missing-sbom', OPTIONAL_RECORD.image, 'no sbom')
    const collect = vi.fn().mockRejectedValue(err)

    const result = await verifyRegistry([OPTIONAL_RECORD], { collectVerifiedImageSbom: collect })

    expect(result.images).toHaveLength(0)
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

  it('skips pendingSbom records entirely', async () => {
    const pending = Object.freeze({ ...REQUIRED_RECORD, pendingSbom: true })
    const collect = vi.fn()

    const result = await verifyRegistry([pending], { collectVerifiedImageSbom: collect })

    expect(collect).not.toHaveBeenCalled()
    expect(result.images).toHaveLength(0)
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
    const allowedKeys = new Set(['id', 'image', 'imageDigest', 'sbomDigest', 'status', 'values', 'missingOptional'])
    for (const key of Object.keys(image)) {
      expect(allowedKeys).toContain(key)
    }
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

  it('returns unavailable when any image is unavailable', () => {
    const result = {
      checkedAt: '2026-08-26T00:00:00.000Z',
      images: [
        { id: 'dakota', product: 'dakota', status: 'verified' },
        { id: 'dakota-gaming', product: 'dakota', status: 'unavailable' },
      ],
    }
    const status = productStatus(result)
    expect(status.dakota.status).toBe('unavailable')
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
      mkdtempSync: vi.fn().mockReturnValue('/fake-tmp/abc'),
      writeFileSync: vi.fn((p, content) => { written[p] = content }),
      renameSync: vi.fn((src, dst) => { renamed[dst] = written[src] }),
      rmSync: vi.fn(),
    }
    const audit = { checkedAt: '2026-08-26T00:00:00.000Z', images: [] }

    writeOutputsAtomically({ 'sbom-audit.json': audit }, '/dest', { fs: fsMock })

    expect(fsMock.mkdirSync).toHaveBeenCalledWith('/dest', { recursive: true })
    expect(fsMock.renameSync).toHaveBeenCalledWith(
      '/fake-tmp/abc/sbom-audit.json',
      '/dest/sbom-audit.json',
    )
    const content = JSON.parse(renamed['/dest/sbom-audit.json'])
    expect(content.checkedAt).toBe('2026-08-26T00:00:00.000Z')
  })

  it('leaves existing files unchanged if validation throws', () => {
    const fsMock = {
      mkdirSync: vi.fn(),
      mkdtempSync: vi.fn().mockReturnValue('/fake-tmp/abc'),
      writeFileSync: vi.fn(),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
    }
    const validate = vi.fn().mockImplementation(() => { throw new Error('invalid') })

    expect(() => writeOutputsAtomically({ 'sbom-audit.json': {} }, '/dest', { fs: fsMock, validate })).toThrow('invalid')
    // renameSync must never have been called
    expect(fsMock.renameSync).not.toHaveBeenCalled()
    // writeFileSync must never have been called (validation ran first)
    expect(fsMock.writeFileSync).not.toHaveBeenCalled()
  })

  it('cleans up the temp dir after a write error', () => {
    const fsMock = {
      mkdirSync: vi.fn(),
      mkdtempSync: vi.fn().mockReturnValue('/fake-tmp/abc'),
      writeFileSync: vi.fn().mockImplementation(() => { throw new Error('disk full') }),
      renameSync: vi.fn(),
      rmSync: vi.fn(),
    }

    expect(() => writeOutputsAtomically({ 'sbom-audit.json': {} }, '/dest', { fs: fsMock })).toThrow('disk full')
    expect(fsMock.rmSync).toHaveBeenCalledWith('/fake-tmp/abc', { recursive: true, force: true })
  })
})
