import { describe, expect, it } from 'vitest'

import { validateImageSbomRegistry } from '../lib/image-sbom-registry.js'

const record = {
  id: 'bluefin-stable',
  product: 'bluefin',
  required: true,
  image: 'ghcr.io/ublue-os/bluefin:stable',
  certificateIdentityRegexp: '^https://github.com/ublue-os/bluefin/.github/workflows/[^@]+@refs/.+$',
  certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
  packages: {
    base: { name: 'kernel-core', type: 'rpm', required: true },
  },
}

describe('validateImageSbomRegistry', () => {
  it('rejects duplicate image registry ids', () => {
    expect(() => validateImageSbomRegistry([
      record,
      { ...record, image: 'ghcr.io/ublue-os/bluefin-nvidia-open:stable' },
    ])).toThrow('duplicate image registry id "bluefin-stable"')
  })

  it('rejects image references without a tag or digest', () => {
    expect(() => validateImageSbomRegistry([
      { ...record, image: 'ghcr.io/ublue-os/bluefin' },
    ])).toThrow('image registry id "bluefin-stable" must use a tagged image reference')
  })

  it('rejects empty certificate identity constraints', () => {
    expect(() => validateImageSbomRegistry([
      { ...record, certificateIdentityRegexp: '' },
    ])).toThrow('image registry id "bluefin-stable" must define certificateIdentityRegexp')

    expect(() => validateImageSbomRegistry([
      { ...record, certificateOidcIssuer: ' ' },
    ])).toThrow('image registry id "bluefin-stable" must define certificateOidcIssuer')
  })

  it('rejects package mappings without a name', () => {
    expect(() => validateImageSbomRegistry([
      {
        ...record,
        packages: {
          base: { required: true },
        },
      },
    ])).toThrow('image registry id "bluefin-stable" package "base" must define name')
  })

  it('rejects package mappings without a required flag', () => {
    expect(() => validateImageSbomRegistry([
      {
        ...record,
        packages: {
          base: { name: 'kernel-core' },
        },
      },
    ])).toThrow('image registry id "bluefin-stable" package "base" must define required as a boolean')
  })

  it('rejects package mappings with non-boolean required flags', () => {
    expect(() => validateImageSbomRegistry([
      {
        ...record,
        packages: {
          base: { name: 'kernel-core', required: 'yes' as unknown as boolean },
        },
      },
    ])).toThrow('image registry id "bluefin-stable" package "base" must define required as a boolean')
  })

  it('rejects an empty packages object unless pendingSbom is true', () => {
    expect(() => validateImageSbomRegistry([
      { ...record, packages: {} },
    ])).toThrow('image registry id "bluefin-stable" must define packages unless pendingSbom is true')
  })

  it('allows empty packages when pendingSbom is true', () => {
    expect(() => validateImageSbomRegistry([
      {
        ...record,
        pendingSbom: true,
        packages: {},
      },
    ])).not.toThrow()
  })
})
