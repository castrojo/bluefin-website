import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockedExec = vi.hoisted(() => vi.fn())

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    default: { ...actual, execFileSync: mockedExec },
    execFileSync: mockedExec,
  }
})

const { discoverSbomDigest, pullImageSbom } = await import('../lib/oci-sbom.js')

const SBOM_ARTIFACT_TYPE = 'application/vnd.spdx+json'
const DIGEST = 'sha256:1111111111111111111111111111111111111111111111111111111111111111'

function discovery(referrers: unknown[]) {
  return JSON.stringify({ referrers })
}

/** Read the `--output` directory out of an `oras pull` argv. */
function outputDirOf(args: string[]) {
  return args[args.indexOf('--output') + 1]
}

describe('discoverSbomDigest', () => {
  beforeEach(() => {
    mockedExec.mockReset()
  })

  it('returns the digest of the SPDX referrer', () => {
    mockedExec.mockReturnValue(discovery([{ artifactType: SBOM_ARTIFACT_TYPE, digest: DIGEST }]) as never)
    expect(discoverSbomDigest('ghcr.io/projectbluefin/bluefin:stable')).toBe(DIGEST)
  })

  it('queries oras discover with the SPDX artifact type and JSON format', () => {
    mockedExec.mockReturnValue(discovery([{ artifactType: SBOM_ARTIFACT_TYPE, digest: DIGEST }]) as never)
    discoverSbomDigest('ghcr.io/projectbluefin/bluefin:stable')

    const [bin, args] = mockedExec.mock.calls[0] as unknown as [string, string[]]
    expect(bin).toBe('oras')
    expect(args).toEqual([
      'discover',
      '--artifact-type',
      SBOM_ARTIFACT_TYPE,
      '--format',
      'json',
      'ghcr.io/projectbluefin/bluefin:stable',
    ])
  })

  it('skips referrers of other artifact types', () => {
    mockedExec.mockReturnValue(discovery([
      { artifactType: 'application/vnd.dev.cosign.simplesigning.v1+json', digest: 'sha256:cosign' },
      { artifactType: SBOM_ARTIFACT_TYPE, digest: DIGEST },
    ]) as never)
    expect(discoverSbomDigest('img')).toBe(DIGEST)
  })

  it('throws when the image has no SPDX referrer', () => {
    mockedExec.mockReturnValue(discovery([
      { artifactType: 'application/vnd.dev.cosign.simplesigning.v1+json', digest: 'sha256:cosign' },
    ]) as never)
    expect(() => discoverSbomDigest('ghcr.io/projectbluefin/bluefin:stable'))
      .toThrow(/ghcr\.io\/projectbluefin\/bluefin:stable has no attached SPDX SBOM/)
  })

  it('throws when the referrers list is absent', () => {
    mockedExec.mockReturnValue('{}' as never)
    expect(() => discoverSbomDigest('img')).toThrow(/no attached SPDX SBOM/)
  })

  it('throws when the SPDX referrer carries no digest', () => {
    mockedExec.mockReturnValue(discovery([{ artifactType: SBOM_ARTIFACT_TYPE }]) as never)
    expect(() => discoverSbomDigest('img')).toThrow(/no attached SPDX SBOM/)
  })
})

describe('pullImageSbom', () => {
  beforeEach(() => {
    mockedExec.mockReset()
  })

  /**
   * Answer `discover` with a referrer and `pull` by materializing files in the
   * requested output directory, mirroring what oras writes to disk.
   */
  function stubOras(files: Record<string, string>) {
    const seen: string[] = []
    mockedExec.mockImplementation(((_bin: string, args: string[]) => {
      if (args[0] === 'discover') {
        return discovery([{ artifactType: SBOM_ARTIFACT_TYPE, digest: DIGEST }])
      }
      const dir = outputDirOf(args)
      seen.push(dir)
      for (const [name, body] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, name), body)
      }
      return ''
    }) as never)
    return seen
  }

  it('returns the parsed SPDX document from the pulled referrer', () => {
    stubOras({ 'sbom.spdx.json': JSON.stringify({ spdxVersion: 'SPDX-2.3', packages: [] }) })
    expect(pullImageSbom('ghcr.io/projectbluefin/bluefin:stable'))
      .toEqual({ spdxVersion: 'SPDX-2.3', packages: [] })
  })

  it('pulls the referrer by digest against the tag-stripped repository', () => {
    stubOras({ 'sbom.spdx.json': '{}' })
    pullImageSbom('ghcr.io/projectbluefin/bluefin:stable')

    const [bin, args] = mockedExec.mock.calls[1] as unknown as [string, string[]]
    expect(bin).toBe('oras')
    expect(args[0]).toBe('pull')
    expect(args[1]).toBe(`ghcr.io/projectbluefin/bluefin@${DIGEST}`)
  })

  it('strips an existing digest pin from the image reference', () => {
    stubOras({ 'sbom.spdx.json': '{}' })
    pullImageSbom('ghcr.io/projectbluefin/bluefin@sha256:deadbeef')

    const [, args] = mockedExec.mock.calls[1] as unknown as [string, string[]]
    expect(args[1]).toBe(`ghcr.io/projectbluefin/bluefin@${DIGEST}`)
  })

  it('ignores non-JSON artifacts in the referrer payload', () => {
    stubOras({
      'README.md': 'not json',
      'sbom.spdx.json': JSON.stringify({ spdxVersion: 'SPDX-2.3' }),
    })
    expect(pullImageSbom('img')).toEqual({ spdxVersion: 'SPDX-2.3' })
  })

  it('throws when the referrer contains no JSON document', () => {
    stubOras({ 'README.md': 'not json' })
    expect(() => pullImageSbom('ghcr.io/projectbluefin/bluefin:stable'))
      .toThrow(/no JSON document in SBOM referrer for ghcr\.io\/projectbluefin\/bluefin:stable/)
  })

  it('removes the temporary output directory after a successful pull', () => {
    const seen = stubOras({ 'sbom.spdx.json': '{}' })
    pullImageSbom('img')
    expect(seen).toHaveLength(1)
    expect(fs.existsSync(seen[0])).toBe(false)
  })

  it('removes the temporary output directory when the pull fails', () => {
    const seen: string[] = []
    mockedExec.mockImplementation(((_bin: string, args: string[]) => {
      if (args[0] === 'discover') {
        return discovery([{ artifactType: SBOM_ARTIFACT_TYPE, digest: DIGEST }])
      }
      seen.push(outputDirOf(args))
      throw new Error('oras pull failed')
    }) as never)

    expect(() => pullImageSbom('img')).toThrow(/oras pull failed/)
    expect(seen).toHaveLength(1)
    expect(fs.existsSync(seen[0])).toBe(false)
  })

  it('does not attempt a pull when discovery finds no SBOM', () => {
    mockedExec.mockReturnValue(discovery([]) as never)
    expect(() => pullImageSbom('img')).toThrow(/no attached SPDX SBOM/)
    expect(mockedExec).toHaveBeenCalledTimes(1)
  })
})
