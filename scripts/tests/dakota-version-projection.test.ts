import { describe, expect, it } from 'vitest'
import { projectDakotaVersions } from '../lib/dakota-version-projection.js'

const IMAGE_DIGEST = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const SBOM_DIGEST = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

const BASE_VERIFIED = {
  id: 'dakota',
  product: 'dakota',
  image: 'ghcr.io/projectbluefin/dakota:latest',
  imageDigest: IMAGE_DIGEST,
  sbomDigest: SBOM_DIGEST,
  status: 'verified',
  values: { kernel: '7.0.7', gnome: '50.2', mesa: '26.1.0', systemd: '260.2', pipewire: '1.6.1', flatpak: '1.16.6', bootc: '1.15.2' },
}

const NVIDIA_VERIFIED = {
  id: 'dakota-nvidia',
  product: 'dakota',
  image: 'ghcr.io/projectbluefin/dakota-nvidia:latest',
  imageDigest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  sbomDigest: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  status: 'verified',
  values: { nvidia: '595.71.05' },
}

const GAMING_VERIFIED = {
  id: 'dakota-gaming',
  product: 'dakota',
  image: 'ghcr.io/projectbluefin/dakota-gaming:testing',
  imageDigest: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  sbomDigest: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  status: 'verified',
  values: { 'ogc-kernel': '7.1.8-ogc1' },
}

const METADATA = {
  isos: [{ label: 'Download ISO', filename: 'dakota-live-alpha4.iso' }],
  baseline: 'x86-64-v3',
}

describe('projectDakotaVersions', () => {
  it('base fields come only from dakota', () => {
    const result = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [BASE_VERIFIED] },
      METADATA,
    )
    expect(result.status).toBe('verified')
    expect(result.packages.kernel).toBe('7.0.7')
    expect(result.packages.gnome).toBe('50.2')
  })

  it('nVIDIA comes only from dakota-nvidia', () => {
    const result = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [BASE_VERIFIED, NVIDIA_VERIFIED] },
      METADATA,
    )
    expect(result.packages.nvidia).toBe('595.71.05')
    // nvidia does NOT appear from base
    const baseOnly = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [BASE_VERIFIED] },
      METADATA,
    )
    expect(baseOnly.packages.nvidia).toBeUndefined()
  })

  it('oGC appears only from verified dakota-gaming', () => {
    const result = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [BASE_VERIFIED, GAMING_VERIFIED] },
      METADATA,
    )
    expect(result.packages['ogc-kernel']).toBe('7.1.8-ogc1')
  })

  it('missing gaming SBOM omits OGC without affecting base Dakota', () => {
    const result = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [BASE_VERIFIED, NVIDIA_VERIFIED] },
      METADATA,
    )
    expect(result.status).toBe('verified')
    expect(result.packages['ogc-kernel']).toBeUndefined()
    expect(result.packages.kernel).toBe('7.0.7')
    expect(result.packages.nvidia).toBe('595.71.05')
  })

  it('required base failure returns status unavailable and packages {}', () => {
    const failedBase = { ...BASE_VERIFIED, status: 'unavailable', values: undefined }
    const result = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [failedBase, NVIDIA_VERIFIED] },
      METADATA,
    )
    expect(result.status).toBe('unavailable')
    expect(result.packages).toEqual({})
  })

  it('isos and baseline metadata survive projection', () => {
    const result = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [BASE_VERIFIED] },
      METADATA,
    )
    expect(result.isos).toEqual(METADATA.isos)
    expect(result.packages.baseline).toBe('x86-64-v3')
  })

  it('stale freedesktop-sdk, Homebrew, and OGC values do not survive', () => {
    // These are NOT in any verified image values, so they must not appear
    const result = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [BASE_VERIFIED, NVIDIA_VERIFIED] },
      METADATA,
    )
    expect(result.packages['freedesktop-sdk']).toBeUndefined()
    expect(result.packages.homebrew).toBeUndefined()
    expect(result.packages['ogc-kernel']).toBeUndefined()
  })

  it('collects sources from all verified dakota images', () => {
    const result = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [BASE_VERIFIED, NVIDIA_VERIFIED] },
      METADATA,
    )
    expect(result.sources).toHaveLength(2)
    expect(result.sources[0].id).toBe('dakota')
    expect(result.sources[1].id).toBe('dakota-nvidia')
  })

  it('uses provided checkedAt override', () => {
    const result = projectDakotaVersions(
      { checkedAt: '2026-08-26T00:00:00Z', images: [BASE_VERIFIED] },
      METADATA,
      '2026-08-27T12:00:00Z',
    )
    expect(result.checkedAt).toBe('2026-08-27T12:00:00Z')
  })
})
