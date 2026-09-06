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

const { verifyImageDigest } = await import('../update-stream-versions.js')

function cosignOutput(digest?: string) {
  return JSON.stringify([
    {
      critical: {
        image: digest ? { 'docker-manifest-digest': digest } : {},
      },
    },
  ])
}

describe('verifyImageDigest', () => {
  beforeEach(() => {
    mockedExec.mockReset()
  })

  it('returns the verified manifest digest from cosign output', () => {
    mockedExec.mockReturnValue(cosignOutput('sha256:abc123') as never)
    expect(verifyImageDigest('cosign', 'ghcr.io/ublue-os/bluefin:stable')).toBe('sha256:abc123')
  })

  it('passes keyless issuer and identity constraints to cosign', () => {
    mockedExec.mockReturnValue(cosignOutput('sha256:abc123') as never)
    verifyImageDigest('cosign', 'ghcr.io/ublue-os/bluefin:stable')
    const [bin, args] = mockedExec.mock.calls[0] as unknown as [string, string[]]
    expect(bin).toBe('cosign')
    expect(args).toContain('verify')
    expect(args).toContain('ghcr.io/ublue-os/bluefin:stable')
    expect(args).toContain('https://token.actions.githubusercontent.com')
    expect(args).toContain('^https://github.com/(ublue-os|projectbluefin)/')
  })

  it('throws when cosign returns no signatures', () => {
    mockedExec.mockReturnValue('[]' as never)
    expect(() => verifyImageDigest('cosign', 'img')).toThrow(/no signatures/)
  })

  it('throws when cosign output lacks a manifest digest', () => {
    mockedExec.mockReturnValue(cosignOutput() as never)
    expect(() => verifyImageDigest('cosign', 'img')).toThrow(/docker-manifest-digest/)
  })

  it('propagates cosign verification failure', () => {
    mockedExec.mockImplementation(() => {
      throw new Error('no matching signatures')
    })
    expect(() => verifyImageDigest('cosign', 'img')).toThrow(/no matching signatures/)
  })
})
