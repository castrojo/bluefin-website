import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  normalizeVersion,
  packageElement,
  extractMappedVersions,
} from '../lib/spdx-version-extractor.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/dakota-linux-elements.spdx.json'), 'utf8'),
)

describe('normalizeVersion', () => {
  it('accepts plain numeric versions', () => {
    expect(normalizeVersion('7.0.7')).toBe('7.0.7')
    expect(normalizeVersion('6.12.40')).toBe('6.12.40')
    expect(normalizeVersion('595.71.05')).toBe('595.71.05')
  })

  it('accepts versions with kernel suffix', () => {
    expect(normalizeVersion('7.1.8-ogc1')).toBe('7.1.8-ogc1')
    expect(normalizeVersion('6.12.40-rc2')).toBe('6.12.40-rc2')
  })

  it('accepts versions with RPM epoch/release', () => {
    expect(normalizeVersion('1:260.2-1')).toBe('1:260.2-1')
  })

  it('rejects commit hashes', () => {
    // SHA-256 of the empty string — unambiguously a valid 64-hex hash
    expect(normalizeVersion('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBeUndefined()
    expect(normalizeVersion('c9372e733d75cf3c5197a0dd29f8a4a422e2dddb9020cab3c179a6f3df03d4be')).toBeUndefined()
  })

  it('rejects null and non-string values', () => {
    expect(normalizeVersion(null)).toBeUndefined()
    expect(normalizeVersion(undefined)).toBeUndefined()
    expect(normalizeVersion(42)).toBeUndefined()
  })
})

describe('packageElement', () => {
  it('returns the bst-element referenceLocator', () => {
    const pkg = FIXTURE.packages.find(p => p.versionInfo === '7.0.7')
    expect(packageElement(pkg)).toBe('components/linux.bst')
  })

  it('returns undefined when no bst-element ref exists', () => {
    expect(packageElement({ name: 'linux', versionInfo: '7.0.7' })).toBeUndefined()
  })
})

describe('extractMappedVersions', () => {
  it('resolves kernel to components/linux.bst version', () => {
    const result = extractMappedVersions(FIXTURE, {
      kernel: { name: 'linux', element: 'components/linux.bst' },
    })
    expect(result.values.kernel).toBe('7.0.7')
    expect(result.missingRequired).toHaveLength(0)
    expect(result.ambiguous).toHaveLength(0)
  })

  it('resolves ogc-kernel from core/linux-ogc.bst', () => {
    const result = extractMappedVersions(FIXTURE, {
      'ogc-kernel': { name: 'linux', element: 'core/linux-ogc.bst' },
    })
    expect(result.values['ogc-kernel']).toBe('7.1.8-ogc1')
  })

  it('resolves nvidia from the NVIDIA-Linux-x86 package', () => {
    const result = extractMappedVersions(FIXTURE, {
      nvidia: { name: 'NVIDIA-Linux-x86' },
    })
    expect(result.values.nvidia).toBe('595.71.05')
  })

  it('reports ambiguous when a name-only mapping matches multiple distinct versions', () => {
    const result = extractMappedVersions(FIXTURE, {
      kernel: { name: 'linux' },
    })
    expect(result.values.kernel).toBeUndefined()
    expect(result.ambiguous).toContain('kernel')
  })

  it('reports missing required fields', () => {
    const result = extractMappedVersions(FIXTURE, {
      brew: { name: 'homebrew', required: true },
    })
    expect(result.missingRequired).toContain('brew')
  })

  it('reports missing optional fields', () => {
    const result = extractMappedVersions(FIXTURE, {
      brew: { name: 'homebrew' },
    })
    expect(result.missingOptional).toContain('brew')
  })

  it('skips duplicate evidence entries (same version, different elements)', () => {
    const sbom = {
      packages: [
        { name: 'foo', versionInfo: '1.2.3', externalRefs: [{ referenceType: 'bst-element', referenceLocator: 'a/foo.bst' }] },
        { name: 'foo', versionInfo: '1.2.3', externalRefs: [{ referenceType: 'bst-element', referenceLocator: 'b/foo.bst' }] },
      ],
    }
    const result = extractMappedVersions(sbom, { foo: { name: 'foo' } })
    expect(result.values.foo).toBe('1.2.3')
    expect(result.ambiguous).toHaveLength(0)
  })

  it('rejects fields and reports them', () => {
    const sbom = {
      packages: [
        { name: 'linux', versionInfo: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
      ],
    }
    const result = extractMappedVersions(sbom, { kernel: { name: 'linux', required: true } })
    expect(result.missingRequired).toContain('kernel')
    expect(result.rejected.some(r => r.field === 'kernel')).toBe(true)
  })
})
