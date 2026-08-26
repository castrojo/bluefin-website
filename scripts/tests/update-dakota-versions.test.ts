import { afterEach, describe, expect, it, vi } from 'vitest'
import { compareVersions, spdxPackageVersion } from '../lib/oci-sbom.js'

const { updateImageVersions } = vi.hoisted(() => ({
  updateImageVersions: vi.fn(),
}))

vi.mock('../update-image-versions.js', () => ({
  updateImageVersions,
}))

const SBOM = {
  spdxVersion: 'SPDX-2.3',
  packages: [
    { name: 'linux', versionInfo: '6.12.40' },
    { name: 'linux', versionInfo: '7.0.7' },
    { name: 'linux', versionInfo: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
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

  it('handles kernel suffixes without producing NaN', () => {
    expect(compareVersions('7.1.8-ogc1', '7.1.7')).toBeGreaterThan(0)
    expect(compareVersions('7.0.7', '7.1.8-ogc1')).toBeLessThan(0)
    expect(compareVersions('7.1.8-ogc1', '7.1.8-ogc1')).toBe(0)
  })

  it('returns undefined when a package has multiple distinct versions (ambiguous)', () => {
    expect(spdxPackageVersion(SBOM, 'linux')).toBeUndefined()
    expect(spdxPackageVersion(SBOM, 'mesa')).toBeUndefined()
    expect(spdxPackageVersion(SBOM, 'systemd')).toBeUndefined()
  })

  it('returns the version when a package has exactly one accepted version', () => {
    expect(spdxPackageVersion(SBOM, 'gnome-shell')).toBe('50.2')
    expect(spdxPackageVersion(SBOM, 'podman')).toBe('5.8.2')
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

describe('update-dakota-versions wrapper', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('exports updateProducts as the entry point', async () => {
    const mod = await import('../update-dakota-versions.js')
    expect(typeof mod.updateProducts).toBe('function')
  })

  it('delegates to the unified atomic updater', async () => {
    updateImageVersions.mockResolvedValue(undefined)
    const { updateProducts } = await import('../update-dakota-versions.js')
    await updateProducts()

    expect(updateImageVersions).toHaveBeenCalledOnce()
  })
})
