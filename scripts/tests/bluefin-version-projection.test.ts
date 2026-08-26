import { describe, expect, it } from 'vitest'
import { projectBluefinStreams } from '../lib/bluefin-version-projection.js'
import { dump as dumpYaml } from 'js-yaml'

const IMAGE_DIGEST = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const SBOM_DIGEST = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

const STABLE_BASE = {
  id: 'bluefin-stable',
  product: 'bluefin',
  image: 'ghcr.io/ublue-os/bluefin:stable',
  imageDigest: IMAGE_DIGEST,
  sbomDigest: SBOM_DIGEST,
  status: 'verified',
  values: {
    base: '7.0.12-201.fc44',
    kernel: '7.0.12-201.fc44',
    gnome: '50.3-1.fc44',
    mesa: '26.1.4-4.fc44',
    systemd: '259.7-1.fc44',
    podman: '5.8.4-1.fc44',
    pipewire: '1.6.8-1.fc44',
    flatpak: '1.18.0-1.fc44',
  },
}

const STABLE_NVIDIA = {
  id: 'bluefin-stable-nvidia',
  product: 'bluefin',
  image: 'ghcr.io/ublue-os/bluefin-nvidia-open:stable',
  imageDigest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  sbomDigest: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  status: 'verified',
  values: { nvidia: '595.71.05' },
}

const LTS_BASE = {
  id: 'bluefin-lts',
  product: 'bluefin',
  image: 'ghcr.io/projectbluefin/bluefin-lts:stable',
  imageDigest: IMAGE_DIGEST,
  sbomDigest: SBOM_DIGEST,
  status: 'verified',
  values: {
    base: 'CentOS Stream 10',
    kernel: '6.12.0-233.el10',
    gnome: '49.5',
    mesa: '25.2.7',
  },
}

const LTS_HWE = {
  id: 'bluefin-lts-hwe',
  product: 'bluefin',
  image: 'ghcr.io/projectbluefin/bluefin-lts-hwe:stable',
  imageDigest: IMAGE_DIGEST,
  sbomDigest: SBOM_DIGEST,
  status: 'verified',
  values: { kernel: '7.0.8-100.fc43' },
}

const LTS_NVIDIA = {
  id: 'bluefin-lts-nvidia',
  product: 'bluefin',
  image: 'ghcr.io/projectbluefin/bluefin-lts-nvidia:stable',
  imageDigest: IMAGE_DIGEST,
  sbomDigest: SBOM_DIGEST,
  status: 'verified',
  values: { nvidia: '575.0' },
}

describe('projectBluefinStreams', () => {
  it('stable values come from bluefin-stable', () => {
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE] },
    )
    expect(result.stable.status).toBe('verified')
    expect(result.stable.kernel).toBe('7.0.12-201.fc44')
    expect(result.stable.gnome).toBe('50.3-1.fc44')
    expect(result.stable.base).toBe('Fedora 44')
  })

  it('stable nvidia comes only from bluefin-stable-nvidia', () => {
    const withNvidia = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE, STABLE_NVIDIA] },
    )
    expect(withNvidia.stable.nvidia).toBe('595.71.05')

    const withoutNvidia = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE] },
    )
    expect(withoutNvidia.stable.nvidia).toBeUndefined()
  })

  it('missing optional nvidia/hwe images omit those fields', () => {
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE] },
    )
    expect(result.stable.nvidia).toBeUndefined()
    expect(result.stable.hwe).toBeUndefined()
  })

  it('currently pending LTS SBOM returns status unavailable with no versions', () => {
    // When LTS images are not in the audit (pendingSbom skips them)
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE] },
    )
    expect(result.lts.status).toBe('unavailable')
    expect(result.lts.kernel).toBeUndefined()
    expect(result.lts.gnome).toBeUndefined()
    expect(result.lts.base).toBeUndefined()
  })

  it('no literal "unknown" appears in serialized YAML', () => {
    // Full result with some missing images
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE, STABLE_NVIDIA] },
    )
    const yaml = dumpYaml(result)
    expect(yaml).not.toContain('unknown')
  })

  it('LTS fields come from their respective images when verified', () => {
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE, LTS_BASE, LTS_HWE, LTS_NVIDIA] },
    )
    expect(result.lts.status).toBe('verified')
    expect(result.lts.kernel).toBe('6.12.0-233.el10')
    expect(result.lts.hwe).toBe('7.0.8-100.fc43')
    expect(result.lts.nvidia).toBe('575.0')
  })

  it('uses provided checkedAt override', () => {
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [] },
      '2026-09-01T00:00:00Z',
    )
    expect(result.checkedAt).toBe('2026-09-01T00:00:00Z')
  })

  it('unavailable stable when bluefin-stable fails verification', () => {
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [
        { ...STABLE_BASE, status: 'unavailable', values: undefined },
      ] },
    )
    expect(result.stable.status).toBe('unavailable')
    expect(result.stable.kernel).toBeUndefined()
  })
})
