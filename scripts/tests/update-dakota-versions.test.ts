import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  applySbomVersions,
  decodeGitHubContent,
  extractFreedesktopSdkVersion,
} from '../update-dakota-versions.js'

describe('update-dakota-versions helpers', () => {
  it('applies dakota and dakota-nvidia package versions from SBOM data', () => {
    const updated = applySbomVersions({
      packages: {
        kernel: 'old-kernel',
        nvidia: 'old-nvidia',
        baseline: 'x86-64-v3',
      },
      generatedAt: 'old-date',
    }, {
      streams: {
        'dakota-latest': {
          releases: {
            latest: {
              packageVersions: {
                kernel: '6.14.0',
                gnome: '48.2',
                mesa: '25.1.0',
                systemd: '257.5',
                podman: '5.5.0',
                pipewire: '1.4.5',
                flatpak: '1.16.1',
                allPackages: {
                  bootc: '1.2.3',
                },
              },
            },
          },
        },
        'dakota-nvidia-latest': {
          releases: {
            latest: {
              packageVersions: {
                nvidia: '570.124.06',
              },
            },
          },
        },
      },
    }, '2025-02-14T00:00:00.000Z')

    expect(updated).toEqual({
      packages: {
        kernel: '6.14.0',
        nvidia: '570.124.06',
        baseline: 'x86-64-v3',
        gnome: '48.2',
        mesa: '25.1.0',
        systemd: '257.5',
        podman: '5.5.0',
        pipewire: '1.4.5',
        flatpak: '1.16.1',
        bootc: '1.2.3',
      },
      generatedAt: '2025-02-14T00:00:00.000Z',
    })
  })

  it('keeps the current data when no dakota release is present', () => {
    const current = {
      packages: { kernel: 'existing' },
      generatedAt: 'old-date',
    }

    expect(applySbomVersions(current, { streams: {} }, 'new-date')).toEqual(current)
  })

  it('decodes GitHub content payloads and extracts the freedesktop SDK version', () => {
    const decoded = decodeGitHubContent(Buffer.from('ref: freedesktop-sdk-25.08.10-0-gdeadbeef\n').toString('base64'), 'base64')
    expect(decoded).toBe('ref: freedesktop-sdk-25.08.10-0-gdeadbeef\n')
    expect(extractFreedesktopSdkVersion(decoded)).toBe('25.08.10')
    expect(extractFreedesktopSdkVersion('ref: missing')).toBeNull()
  })
})
