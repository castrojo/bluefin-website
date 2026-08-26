import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  EvidenceError,
  resolveImageDigest,
  discoverReferrers,
  verifyImageProvenance,
  pullSpdxReferrer,
  collectVerifiedImageSbom,
} from '../lib/verified-image-sbom.js'

const dakotaDiscovery = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/oras-dakota-discovery.json'), 'utf8'),
)
const gamingDiscovery = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/oras-gaming-no-sbom.json'), 'utf8'),
)

const DAKOTA_DIGEST = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const SBOM_DIGEST = 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
const GAMING_DIGEST = 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'

const DAKOTA_RECORD = {
  id: 'dakota',
  product: 'dakota',
  required: true,
  image: 'ghcr.io/projectbluefin/dakota:latest',
  certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
  certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
  packages: {},
}

const GAMING_RECORD = {
  id: 'dakota-gaming',
  product: 'dakota',
  required: false,
  pendingSbom: true,
  image: 'ghcr.io/projectbluefin/dakota-gaming:testing',
  certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
  certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
  packages: {},
}

describe('resolveImageDigest', () => {
  it('resolves a moving tag to a repository@sha256 reference', () => {
    const run = vi.fn().mockReturnValue(
      JSON.stringify({ digest: DAKOTA_DIGEST }),
    )
    const result = resolveImageDigest('ghcr.io/projectbluefin/dakota:latest', run)
    expect(result).toBe(`ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`)
    expect(run).toHaveBeenCalledWith(
      'oras',
      ['manifest', 'fetch', '--descriptor', 'ghcr.io/projectbluefin/dakota:latest'],
      expect.objectContaining({ encoding: 'utf8' }),
    )
  })

  it('throws EvidenceError with code image-not-found on failure', () => {
    const run = vi.fn().mockImplementation(() => { throw new Error('not found') })
    expect(() => resolveImageDigest('ghcr.io/projectbluefin/dakota:latest', run))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'image-not-found' }))
  })
})

describe('discoverReferrers', () => {
  it('calls oras discover against the digest reference, not the tag', () => {
    const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
    const run = vi.fn().mockReturnValue(JSON.stringify(dakotaDiscovery))
    const result = discoverReferrers(imageAtDigest, run)
    expect(run).toHaveBeenCalledWith(
      'oras',
      ['discover', '--format', 'json', imageAtDigest],
      expect.objectContaining({ encoding: 'utf8' }),
    )
    expect(result).toEqual(dakotaDiscovery.referrers)
  })

  it('throws EvidenceError image-not-found on command failure', () => {
    const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
    const run = vi.fn().mockImplementation(() => { throw new Error('connection refused') })
    expect(() => discoverReferrers(imageAtDigest, run))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'image-not-found' }))
  })

  it('throws EvidenceError invalid-sbom on malformed discovery JSON', () => {
    const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
    const run = vi.fn().mockReturnValue('not json {{{')
    expect(() => discoverReferrers(imageAtDigest, run))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'invalid-sbom' }))
  })
})

describe('verifyImageProvenance', () => {
  it('calls cosign verify-attestation with correct arguments', () => {
    const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
    const policy = {
      certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.+$',
      certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    }
    const run = vi.fn().mockReturnValue('')
    verifyImageProvenance(imageAtDigest, policy, run)
    expect(run).toHaveBeenCalledWith(
      'cosign',
      [
        'verify-attestation',
        '--type', 'slsaprovenance',
        '--certificate-identity-regexp', policy.certificateIdentityRegexp,
        '--certificate-oidc-issuer', policy.certificateOidcIssuer,
        imageAtDigest,
      ],
      expect.objectContaining({ encoding: 'utf8' }),
    )
  })

  it('throws EvidenceError with code missing-provenance when cosign finds nothing', () => {
    const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
    const policy = {
      certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.+$',
      certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    }
    const run = vi.fn().mockImplementation(() => { throw new Error('no matching attestations') })
    expect(() => verifyImageProvenance(imageAtDigest, policy, run))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'missing-provenance' }))
  })

  it('throws EvidenceError with code invalid-provenance on other cosign failures', () => {
    const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
    const policy = {
      certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.+$',
      certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    }
    const run = vi.fn().mockImplementation(() => { throw new Error('certificate chain validation failed') })
    expect(() => verifyImageProvenance(imageAtDigest, policy, run))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'invalid-provenance' }))
  })
})

describe('pullSpdxReferrer', () => {
  it('cleans up temp directory on success', () => {
    const mockFs = {
      mkdtempSync: vi.fn().mockReturnValue('/mock-tmp/sbom-xyz'),
      readdirSync: vi.fn().mockReturnValue(['sbom.spdx.json']),
      readFileSync: vi.fn().mockReturnValue(JSON.stringify({ spdxVersion: 'SPDX-2.3', packages: [] })),
      rmSync: vi.fn(),
    }
    const run = vi.fn().mockReturnValue('')
    const result = pullSpdxReferrer('ghcr.io/projectbluefin/dakota', SBOM_DIGEST, run, mockFs)
    expect(mockFs.rmSync).toHaveBeenCalledTimes(1)
    expect(mockFs.rmSync).toHaveBeenCalledWith('/mock-tmp/sbom-xyz', expect.objectContaining({ recursive: true }))
    expect(result).toMatchObject({ spdxVersion: 'SPDX-2.3' })
  })

  it('cleans up temp directory on failure', () => {
    const mockFs = {
      mkdtempSync: vi.fn().mockReturnValue('/mock-tmp/sbom-xyz'),
      readdirSync: vi.fn().mockReturnValue([]),
      readFileSync: vi.fn(),
      rmSync: vi.fn(),
    }
    const run = vi.fn().mockReturnValue('')
    expect(() => pullSpdxReferrer('ghcr.io/projectbluefin/dakota', SBOM_DIGEST, run, mockFs))
      .toThrow(EvidenceError)
    expect(mockFs.rmSync).toHaveBeenCalledTimes(1)
    expect(mockFs.rmSync).toHaveBeenCalledWith('/mock-tmp/sbom-xyz', expect.objectContaining({ recursive: true }))
  })
})

describe('collectVerifiedImageSbom', () => {
  it('requires exactly one SPDX referrer — missing SBOM returns EvidenceError missing-sbom', async () => {
    const deps = {
      run: vi.fn()
        .mockReturnValueOnce(JSON.stringify({ digest: GAMING_DIGEST }))
        .mockReturnValueOnce(JSON.stringify(gamingDiscovery))
        .mockReturnValue(''),
    }
    await expect(collectVerifiedImageSbom(GAMING_RECORD, deps)).rejects.toMatchObject({
      name: 'EvidenceError',
      code: 'missing-sbom',
    })
  })

  it('collects verified image SBOM for dakota with both provenance and SPDX', async () => {
    const spdxDoc = { spdxVersion: 'SPDX-2.3', packages: [{ name: 'linux', versionInfo: '6.12.0' }] }
    const mockFs = {
      mkdtempSync: vi.fn().mockReturnValue('/mock-tmp/sbom-abc'),
      readdirSync: vi.fn().mockReturnValue(['sbom.spdx.json']),
      readFileSync: vi.fn().mockReturnValue(JSON.stringify(spdxDoc)),
      rmSync: vi.fn(),
    }
    const deps = {
      run: vi.fn()
        .mockReturnValueOnce(JSON.stringify({ digest: DAKOTA_DIGEST }))
        .mockReturnValueOnce(JSON.stringify(dakotaDiscovery))
        .mockReturnValueOnce('')
        .mockReturnValueOnce(''),
      fs: mockFs,
    }
    const result = await collectVerifiedImageSbom(DAKOTA_RECORD, deps)
    expect(result.id).toBe('dakota')
    expect(result.image).toBe('ghcr.io/projectbluefin/dakota:latest')
    expect(result.imageDigest).toBe(DAKOTA_DIGEST)
    expect(result.sbomDigest).toBe(SBOM_DIGEST)
    expect(result.sbom).toMatchObject(spdxDoc)
    expect(result.checkedAt).toBeTypeOf('string')
  })

  it('throws EvidenceError ambiguous-sbom when multiple SPDX referrers exist', async () => {
    const ambiguousDiscovery = {
      ...dakotaDiscovery,
      referrers: [
        ...dakotaDiscovery.referrers,
        {
          reference: `ghcr.io/projectbluefin/dakota@sha256:ff${'f'.repeat(62)}`,
          digest: `sha256:ff${'f'.repeat(62)}`,
          mediaType: 'application/vnd.spdx+json',
          artifactType: 'application/vnd.spdx+json',
        },
      ],
    }
    const deps = {
      run: vi.fn()
        .mockReturnValueOnce(JSON.stringify({ digest: DAKOTA_DIGEST }))
        .mockReturnValueOnce(JSON.stringify(ambiguousDiscovery))
        .mockReturnValue(''),
    }
    await expect(collectVerifiedImageSbom(DAKOTA_RECORD, deps)).rejects.toMatchObject({ code: 'ambiguous-sbom' })
  })
})
