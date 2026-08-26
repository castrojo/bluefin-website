import { dump as dumpYaml } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { normalizeUserVersion, projectBluefinStreams } from '../lib/bluefin-version-projection.js'

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
  values: { nvidia: '3:610.57.04-1.fc44' },
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
  it('stable values come from bluefin-stable with normalized versions', () => {
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE] },
    )
    expect(result.stable.status).toBe('verified')
    expect(result.stable.kernel).toBe('7.0.12-201')
    expect(result.stable.gnome).toBe('50.3-1')
    expect(result.stable.base).toBe('Fedora 44')
  })

  it('stable nvidia comes only from bluefin-stable-nvidia, epoch stripped', () => {
    const withNvidia = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE, STABLE_NVIDIA] },
    )
    expect(withNvidia.stable.nvidia).toBe('610.57.04-1')

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

  it('lTS fields come from their respective images when verified', () => {
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE, LTS_BASE, LTS_HWE, LTS_NVIDIA] },
    )
    expect(result.lts.status).toBe('verified')
    expect(result.lts.kernel).toBe('6.12.0-233')
    expect(result.lts.hwe).toBe('7.0.8-100')
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

describe('normalizeUserVersion', () => {
  it('strips .fcNN suffix preserving RPM release', () => {
    expect(normalizeUserVersion('7.1.6-201.fc44')).toBe('7.1.6-201')
    expect(normalizeUserVersion('50.3-1.fc44')).toBe('50.3-1')
  })

  it('strips leading numeric epoch and .fcNN suffix', () => {
    expect(normalizeUserVersion('3:610.57.04-1.fc44')).toBe('610.57.04-1')
  })

  it('strips .elNN suffix', () => {
    expect(normalizeUserVersion('6.12.0-233.el10')).toBe('6.12.0-233')
    expect(normalizeUserVersion('49.5')).toBe('49.5')
  })

  it('passes through versions without epoch or dist-tag', () => {
    expect(normalizeUserVersion('595.71.05')).toBe('595.71.05')
    expect(normalizeUserVersion('1.2.3')).toBe('1.2.3')
  })
})

describe('yAML serialization', () => {
  it('full serialization with partial optional data contains no literal unknown', () => {
    // Stable verified with NVIDIA, LTS unavailable (partial data)
    const result = projectBluefinStreams(
      { checkedAt: '2026-08-26T00:00:00Z', images: [STABLE_BASE, STABLE_NVIDIA] },
    )
    const yaml = dumpYaml(result)
    expect(yaml).not.toContain('unknown')
    expect(yaml).toContain('checkedAt')
    expect(yaml).toContain('2026-08-26T00:00:00Z')
    expect(yaml).toContain('verified')
    expect(yaml).toContain('unavailable')
  })
})

describe('projectBluefinStreams — degraded evidence', () => {
  it('publishes the verified values of a degraded base image', () => {
    const degradedStable = {
      ...STABLE_BASE,
      status: 'degraded',
      errorCode: 'ambiguous-optional',
      ambiguousOptional: ['mesa'],
      values: { ...STABLE_BASE.values },
    }
    delete degradedStable.values.mesa

    const result = projectBluefinStreams({ checkedAt: '2026-08-26T00:00:00Z', images: [degradedStable] })

    expect(result.stable.status).toBe('verified')
    expect(result.stable.kernel).toBe('7.0.12-201')
    expect(result.stable).not.toHaveProperty('mesa')
  })

  it('merges a degraded optional image without publishing its unresolved field', () => {
    const degradedNvidia = {
      ...STABLE_NVIDIA,
      status: 'degraded',
      errorCode: 'missing-optional',
      missingOptional: ['nvidiaExtra'],
    }

    const result = projectBluefinStreams({
      checkedAt: '2026-08-26T00:00:00Z',
      images: [STABLE_BASE, degradedNvidia],
    })

    expect(result.stable.nvidia).toBe('610.57.04-1')
    expect(result.stable).not.toHaveProperty('nvidiaExtra')
  })

  it('never publishes values from an unavailable required base image', () => {
    const unavailableStable = {
      id: 'bluefin-stable',
      product: 'bluefin',
      image: 'ghcr.io/ublue-os/bluefin:stable',
      required: true,
      status: 'unavailable',
      errorCode: 'ambiguous-required',
      ambiguousRequired: ['kernel'],
    }

    const result = projectBluefinStreams({
      checkedAt: '2026-08-26T00:00:00Z',
      images: [unavailableStable, STABLE_NVIDIA],
    })

    expect(result.stable).toEqual({ status: 'unavailable' })
  })

  it('ignores values on an unavailable optional image even if the audit kept them', () => {
    const unavailableNvidia = {
      ...STABLE_NVIDIA,
      status: 'unavailable',
      errorCode: 'ambiguous-required',
      values: { nvidia: '3:610.57.04-1.fc44' },
    }

    const result = projectBluefinStreams({
      checkedAt: '2026-08-26T00:00:00Z',
      images: [STABLE_BASE, unavailableNvidia],
    })

    expect(result.stable).not.toHaveProperty('nvidia')
  })

  it('normalizes an RPM epoch on a podman value pinned by foundBy', () => {
    const withPodman = {
      ...STABLE_BASE,
      values: { ...STABLE_BASE.values, podman: '5:5.8.4-1.fc44' },
    }

    const result = projectBluefinStreams({ checkedAt: '2026-08-26T00:00:00Z', images: [withPodman] })

    expect(result.stable.podman).toBe('5.8.4-1')
  })
})
