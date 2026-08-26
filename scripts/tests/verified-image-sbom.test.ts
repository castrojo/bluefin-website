import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  collectVerifiedImageSbom,
  discoverReferrers,
  EvidenceError,
  pullSpdxReferrer,
  resolveImageDigest,
  ToolingError,
  verifyImageProvenance,
} from '../lib/verified-image-sbom.js'

const dakotaDiscovery = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/oras-dakota-discovery.json'), 'utf8'),
)
const gamingDiscovery = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/oras-gaming-no-sbom.json'), 'utf8'),
)
const gamingWithSbomDiscovery = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/oras-gaming-with-sbom.json'), 'utf8'),
)
const gamingOgcSbom = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/dakota-gaming-ogc.spdx.json'), 'utf8'),
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
    const run = vi.fn().mockImplementation(() => {
      throw new Error('not found')
    })
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

  it('throws ToolingError on a transport failure rather than sanitizing the image', () => {
    const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
    const run = vi.fn().mockImplementation(() => {
      throw new Error('connection refused')
    })
    expect(() => discoverReferrers(imageAtDigest, run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'transport' }))
  })

  it('throws ToolingError malformed-output on unparseable discovery JSON', () => {
    const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
    const run = vi.fn().mockReturnValue('not json {{{')
    expect(() => discoverReferrers(imageAtDigest, run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'malformed-output' }))
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
        '--type',
        'https://slsa.dev/provenance/v1',
        '--certificate-identity-regexp',
        policy.certificateIdentityRegexp,
        '--certificate-oidc-issuer',
        policy.certificateOidcIssuer,
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
    const run = vi.fn().mockImplementation(() => {
      throw new Error('no matching attestations')
    })
    expect(() => verifyImageProvenance(imageAtDigest, policy, run))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'missing-provenance' }))
  })

  it('throws EvidenceError with code invalid-provenance on other cosign failures', () => {
    const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
    const policy = {
      certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.+$',
      certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    }
    const run = vi.fn().mockImplementation(() => {
      throw new Error('certificate chain validation failed')
    })
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

// ---------------------------------------------------------------------------
// Tooling and transport failures must block, never sanitize
//
// An evidence failure says "the publisher did not publish this"; a tooling
// failure says "we could not look". Only the first may remove a field from the
// website, so every non-answer has to be classified before it reaches the
// audit.
// ---------------------------------------------------------------------------

function spawnEnoent(binary: string) {
  const err = new Error(`spawnSync ${binary} ENOENT`) as NodeJS.ErrnoException & { syscall?: string }
  err.code = 'ENOENT'
  err.syscall = `spawnSync ${binary}`
  err.path = binary
  return err
}

function withStderr(message: string, stderr: string) {
  const err = new Error(message) as Error & { stderr?: string }
  err.stderr = stderr
  return err
}

describe('tooling failures block', () => {
  const imageAtDigest = `ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`
  const policy = {
    certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
  }

  it('classifies a missing oras binary as tool-missing', () => {
    const run = vi.fn().mockImplementation(() => {
      throw spawnEnoent('oras')
    })
    expect(() => resolveImageDigest('ghcr.io/projectbluefin/dakota:latest', run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'tool-missing' }))
  })

  it('classifies a missing cosign binary as tool-missing', () => {
    const run = vi.fn().mockImplementation(() => {
      throw spawnEnoent('cosign')
    })
    expect(() => verifyImageProvenance(imageAtDigest, policy, run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'tool-missing' }))
  })

  it('classifies registry rate limiting as registry-unavailable', () => {
    const run = vi.fn().mockImplementation(() => {
      throw withStderr('oras failed', 'TOOMANYREQUESTS: retry-after 60s: unexpected status code 429')
    })
    expect(() => resolveImageDigest('ghcr.io/projectbluefin/dakota:latest', run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'registry-unavailable' }))
  })

  it('classifies a registry 503 as registry-unavailable', () => {
    const run = vi.fn().mockImplementation(() => {
      throw withStderr('oras failed', 'response status code 503: Service Unavailable')
    })
    expect(() => discoverReferrers(imageAtDigest, run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'registry-unavailable' }))
  })

  it('classifies a TLS handshake failure as transport', () => {
    const run = vi.fn().mockImplementation(() => {
      throw withStderr('oras failed', 'remote error: tls: handshake failure')
    })
    expect(() => discoverReferrers(imageAtDigest, run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'transport' }))
  })

  it('classifies a DNS failure as transport', () => {
    const run = vi.fn().mockImplementation(() => {
      throw withStderr('oras failed', 'dial tcp: lookup ghcr.io: no such host')
    })
    expect(() => resolveImageDigest('ghcr.io/projectbluefin/dakota:latest', run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'transport' }))
  })

  it('classifies a killed process as tool-timeout', () => {
    const run = vi.fn().mockImplementation(() => {
      const err = new Error('oras timed out') as Error & { killed?: boolean, signal?: string }
      err.killed = true
      err.signal = 'SIGTERM'
      throw err
    })
    expect(() => discoverReferrers(imageAtDigest, run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'tool-timeout' }))
  })

  it('blocks on an unrecognised oras failure rather than guessing absence', () => {
    const run = vi.fn().mockImplementation(() => {
      throw new Error('oras exited with an unfamiliar message')
    })
    expect(() => discoverReferrers(imageAtDigest, run))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'tool-failure' }))
  })

  it('blocks when oras pull fails for transport reasons', () => {
    const mockFs = {
      mkdtempSync: vi.fn().mockReturnValue('/mock-tmp/sbom-xyz'),
      readdirSync: vi.fn(),
      readFileSync: vi.fn(),
      rmSync: vi.fn(),
    }
    const run = vi.fn().mockImplementation(() => {
      throw withStderr('oras pull failed', 'connection reset by peer')
    })
    expect(() => pullSpdxReferrer('ghcr.io/projectbluefin/dakota', SBOM_DIGEST, run, mockFs))
      .toThrow(expect.objectContaining({ name: 'ToolingError', code: 'transport' }))
    expect(mockFs.rmSync).toHaveBeenCalledTimes(1)
  })

  it('keeps a genuinely absent referrer artifact an evidence failure', () => {
    const mockFs = {
      mkdtempSync: vi.fn().mockReturnValue('/mock-tmp/sbom-xyz'),
      readdirSync: vi.fn(),
      readFileSync: vi.fn(),
      rmSync: vi.fn(),
    }
    const run = vi.fn().mockImplementation(() => {
      throw withStderr('oras pull failed', 'MANIFEST_UNKNOWN: manifest unknown')
    })
    expect(() => pullSpdxReferrer('ghcr.io/projectbluefin/dakota', SBOM_DIGEST, run, mockFs))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'invalid-sbom' }))
  })

  it('keeps a corrupt discovered SBOM document an evidence failure', () => {
    const mockFs = {
      mkdtempSync: vi.fn().mockReturnValue('/mock-tmp/sbom-xyz'),
      readdirSync: vi.fn().mockReturnValue(['sbom.spdx.json']),
      readFileSync: vi.fn().mockReturnValue('{ truncated'),
      rmSync: vi.fn(),
    }
    const run = vi.fn().mockReturnValue('')
    expect(() => pullSpdxReferrer('ghcr.io/projectbluefin/dakota', SBOM_DIGEST, run, mockFs))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'invalid-sbom' }))
  })

  it('keeps a genuinely absent image an evidence failure', () => {
    const run = vi.fn().mockImplementation(() => {
      throw withStderr('oras failed', 'ghcr.io/projectbluefin/nope:latest: not found: NAME_UNKNOWN: repository name not known to registry')
    })
    expect(() => resolveImageDigest('ghcr.io/projectbluefin/nope:latest', run))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'image-not-found' }))
  })

  it('keeps a missing attestation an evidence failure', () => {
    const run = vi.fn().mockImplementation(() => {
      throw new Error('no matching attestations found')
    })
    expect(() => verifyImageProvenance(imageAtDigest, policy, run))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'missing-provenance' }))
  })

  it('keeps a wrong publisher identity an evidence failure', () => {
    const run = vi.fn().mockImplementation(() => {
      throw withStderr(
        'cosign failed',
        'none of the expected identities matched what was in the certificate, got subjects [https://github.com/attacker/evil/.github/workflows/build.yml@refs/heads/main]',
      )
    })
    expect(() => verifyImageProvenance(imageAtDigest, policy, run))
      .toThrow(expect.objectContaining({ name: 'EvidenceError', code: 'invalid-provenance' }))
  })

  it('exports ToolingError as a distinct type from EvidenceError', () => {
    const tooling = new ToolingError('transport', 'oras', 'boom')
    expect(tooling).toBeInstanceOf(Error)
    expect(tooling).not.toBeInstanceOf(EvidenceError)
    expect(tooling.name).toBe('ToolingError')
  })
})

// ---------------------------------------------------------------------------
// Publisher identity and future SBOM publication, at the collector seam
// ---------------------------------------------------------------------------

describe('collectVerifiedImageSbom — publisher identity', () => {
  it('rejects an image whose provenance was signed by the wrong publisher', async () => {
    const identityFailure = new Error('cosign failed') as Error & { stderr?: string }
    identityFailure.stderr = 'none of the expected identities matched what was in the certificate, '
      + 'got subjects [https://github.com/attacker/evil/.github/workflows/build.yml@refs/heads/main]'

    const run = vi.fn()
      .mockReturnValueOnce(JSON.stringify({ digest: DAKOTA_DIGEST }))
      .mockReturnValueOnce(JSON.stringify(dakotaDiscovery))
      .mockImplementationOnce(() => {
        throw identityFailure
      })

    await expect(collectVerifiedImageSbom(DAKOTA_RECORD, { run })).rejects.toMatchObject({
      name: 'EvidenceError',
      code: 'invalid-provenance',
    })
  })

  it('passes the record identity policy to cosign verbatim', async () => {
    const mockFs = {
      mkdtempSync: vi.fn().mockReturnValue('/mock-tmp/sbom-abc'),
      readdirSync: vi.fn().mockReturnValue(['sbom.spdx.json']),
      readFileSync: vi.fn().mockReturnValue(JSON.stringify({ packages: [] })),
      rmSync: vi.fn(),
    }
    const run = vi.fn()
      .mockReturnValueOnce(JSON.stringify({ digest: DAKOTA_DIGEST }))
      .mockReturnValueOnce(JSON.stringify(dakotaDiscovery))
      .mockReturnValue('')

    await collectVerifiedImageSbom(DAKOTA_RECORD, { run, fs: mockFs })

    const cosignCall = run.mock.calls.find(call => call[0] === 'cosign')
    expect(cosignCall![1]).toContain(DAKOTA_RECORD.certificateIdentityRegexp)
    expect(cosignCall![1]).toContain(DAKOTA_RECORD.certificateOidcIssuer)
    expect(cosignCall![1]).toContain(`ghcr.io/projectbluefin/dakota@${DAKOTA_DIGEST}`)
  })
})

describe('collectVerifiedImageSbom — a pending image starts publishing an SBOM', () => {
  it('collects the newly published SPDX document', async () => {
    const mockFs = {
      mkdtempSync: vi.fn().mockReturnValue('/mock-tmp/sbom-gaming'),
      readdirSync: vi.fn().mockReturnValue(['sbom.spdx.json']),
      readFileSync: vi.fn().mockReturnValue(JSON.stringify(gamingOgcSbom)),
      rmSync: vi.fn(),
    }
    const run = vi.fn()
      .mockReturnValueOnce(JSON.stringify({ digest: GAMING_DIGEST }))
      .mockReturnValueOnce(JSON.stringify(gamingWithSbomDiscovery))
      .mockReturnValue('')

    const result = await collectVerifiedImageSbom(GAMING_RECORD, { run, fs: mockFs })

    expect(result.imageDigest).toBe(GAMING_DIGEST)
    expect(result.sbomDigest).toBe(`sha256:${'f'.repeat(64)}`)
    expect(result.sbom.packages).toHaveLength(2)
  })
})
