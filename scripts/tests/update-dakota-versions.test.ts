import { describe, expect, it } from 'vitest'
import { compareVersions, spdxPackageVersion } from '../lib/oci-sbom.js'
import { applyVersions, versionsFromSbom } from '../update-dakota-versions.js'

const SBOM = {
  spdxVersion: 'SPDX-2.3',
  packages: [
    // BuildStream lists a package once per element, so duplicates and
    // commit-hash refs both appear for the same name.
    { name: 'linux', versionInfo: '6.12.40' },
    { name: 'linux', versionInfo: '7.0.7' },
    { name: 'linux', versionInfo: '5d3ebfdaa692b0ed53a7a05ba772fa5e1c72271060ed4c11d9e9dbe7ad2bd218' },
    { name: 'linux', versionInfo: null },
    { name: 'gnome-shell', versionInfo: '50.2' },
    { name: 'mesa', versionInfo: '26.0.6' },
    { name: 'mesa', versionInfo: '26.1.0' },
    { name: 'systemd', versionInfo: '257.13' },
    { name: 'systemd', versionInfo: '260.2' },
    { name: 'podman', versionInfo: '5.8.2' },
    { name: 'pipewire', versionInfo: '1.6.1' },
    { name: 'flatpak', versionInfo: '1.16.6' },
    { name: 'bootc', versionInfo: '1.15.2' },
  ],
}

describe('oci-sbom helpers', () => {
  it('orders versions by numeric segment, not lexically', () => {
    expect(compareVersions('7.0.7', '6.12.40')).toBeGreaterThan(0)
    expect(compareVersions('26.0.6', '26.1.0')).toBeLessThan(0)
    expect(compareVersions('1.6.1', '1.6.1')).toBe(0)
  })

  it('returns the highest version when a package appears more than once', () => {
    expect(spdxPackageVersion(SBOM, 'linux')).toBe('7.0.7')
    expect(spdxPackageVersion(SBOM, 'mesa')).toBe('26.1.0')
    expect(spdxPackageVersion(SBOM, 'systemd')).toBe('260.2')
  })

  it('ignores commit hashes and null versions', () => {
    const hashOnly = { packages: [
      { name: 'gnome-shell', versionInfo: 'c9372e733d75cf3c5197a0dd29f8a4a422e2dddb9020cab3c179a6f3df03d4be' },
      { name: 'gnome-shell', versionInfo: null },
    ] }
    expect(spdxPackageVersion(hashOnly, 'gnome-shell')).toBeUndefined()
  })

  it('returns undefined for a package that is not in the SBOM', () => {
    expect(spdxPackageVersion(SBOM, 'freedesktop-sdk')).toBeUndefined()
    expect(spdxPackageVersion(SBOM, 'brew')).toBeUndefined()
  })
})

describe('update-dakota-versions helpers', () => {
  it('maps SBOM package names onto dakota-versions fields', () => {
    expect(versionsFromSbom(SBOM, { kernel: 'linux', gnome: 'gnome-shell' })).toEqual({
      kernel: '7.0.7',
      gnome: '50.2',
    })
  })

  it('omits fields the SBOM does not carry rather than inventing them', () => {
    expect(versionsFromSbom(SBOM, { nvidia: 'NVIDIA-Linux-x86' })).toEqual({})
  })

  it('replaces derived versions, preserves metadata, and restamps generatedAt', () => {
    const updated = applyVersions(
      {
        generatedAt: 'old-date',
        isos: [{ label: 'Download ISO', filename: 'dakota-live-alpha4.iso' }],
        packages: {
          'kernel': 'old',
          'baseline': 'x86-64-v3',
          'ogc-kernel': '595.71.05',
        },
      },
      { kernel: '7.0.7', gnome: '50.2' },
      '2026-08-26T00:00:00.000Z',
    )

    expect(updated.generatedAt).toBe('2026-08-26T00:00:00.000Z')
    expect(updated.packages).toEqual({
      kernel: '7.0.7',
      gnome: '50.2',
      baseline: 'x86-64-v3',
    })
    expect(updated.isos).toHaveLength(1)
  })
})
