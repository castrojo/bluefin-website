import { describe, expect, it } from 'vitest'
import {
  extractNvidiaVersion,
  extractVersion,
  parseSBOM,
  parseSysext,
  parseVersionTxt,
} from '../update-server-versions.js'

describe('update-server-versions helpers', () => {
  it('parses version.txt content into version metadata', () => {
    expect(parseVersionTxt('FLATCAR_VERSION="4152.2.1"\nFLATCAR_BUILD_ID="2025-02-14-1234"\n')).toEqual({
      version: '4152.2.1',
      buildDate: '2025-02-14',
    })
  })

  it('extracts core package versions from an SPDX SBOM', () => {
    expect(parseSBOM({
      packages: [
        { name: 'sys-kernel/coreos-kernel', versionInfo: '6.12.1' },
        { name: 'sys-apps/systemd', versionInfo: '256.9-r1' },
        { name: 'sys-apps/ignition', versionInfo: '2.20.0-r2' },
        { name: 'dev-db/etcd', versionInfo: '3.5.18' },
      ],
    })).toEqual({
      kernel: '6.12.1',
      systemd: '256.9-r1',
      ignition: '2.20.0',
      etcd: '3.5.18',
    })
  })

  it('extracts sysext package versions without docker subpackages', () => {
    expect(parseSysext([
      'app-containers/docker-28.1.1::flatcar',
      'app-containers/docker-cli-28.1.1::flatcar',
      'app-containers/docker-buildx-0.23.0::flatcar',
      'app-containers/containerd-2.1.0::flatcar',
    ].join('\n'))).toEqual({
      docker: '28.1.1',
      containerd: '2.1.0',
    })
  })

  it('extracts individual versions from package lines', () => {
    expect(extractVersion('app-containers/docker-28.1.1::flatcar', 'app-containers/docker-')).toBe('28.1.1')
    expect(extractVersion('app-containers/containerd-2.1.0', 'app-containers/containerd-')).toBe('2.1.0')
  })

  it('extracts the NVIDIA driver version from sysext contents', () => {
    expect(extractNvidiaVersion('usr/lib64/libcuda.so.570.124.06\n')).toBe('570.124.06')
    expect(extractNvidiaVersion('no driver here')).toBeNull()
  })
})
