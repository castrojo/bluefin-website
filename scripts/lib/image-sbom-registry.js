/**
 * @typedef {{
 *   name: string,
 *   element?: string,
 *   type?: string,
 *   foundBy?: string,
 *   required: boolean
 * }} ImageSbomPackageRecord
 *
 * @typedef {{
 *   id: string,
 *   product: 'bluefin'|'dakota',
 *   required: boolean,
 *   pendingSbom?: boolean,
 *   image: string,
 *   certificateIdentityRegexp: string,
 *   certificateOidcIssuer: string,
 *   packages: Record<string, ImageSbomPackageRecord>
 * }} ImageSbomRecord
 */

function freezePackage(record) {
  return Object.freeze(record)
}

function freezeRecord(record) {
  const packages = Object.fromEntries(
    Object.entries(record.packages).map(([field, pkg]) => [field, freezePackage(Object.freeze({ ...pkg }))]),
  )

  return Object.freeze({
    ...record,
    packages: Object.freeze(packages),
  })
}

function hasImageTagOrDigest(image) {
  return /@sha256:[a-f0-9]{64}$/i.test(image) || /:[^/@]+$/u.test(image)
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * Validate the SBOM registry before any network access can occur.
 * @param {readonly ImageSbomRecord[]} records
 */
export function validateImageSbomRegistry(records) {
  assert(Array.isArray(records), 'image SBOM registry must be an array')

  const seenIds = new Set()

  for (const record of records) {
    assert(isRecord(record), 'image SBOM registry records must be objects')
    assert(typeof record.id === 'string' && record.id.trim() !== '', 'image registry record must define id')
    if (seenIds.has(record.id)) {
      throw new Error(`duplicate image registry id "${record.id}"`)
    }
    seenIds.add(record.id)

    assert(typeof record.product === 'string' && ['bluefin', 'dakota'].includes(record.product), `image registry id "${record.id}" must define product`)
    assert(typeof record.required === 'boolean', `image registry id "${record.id}" must define required`)
    assert(typeof record.image === 'string' && record.image.trim() !== '', `image registry id "${record.id}" must define image`)
    assert(hasImageTagOrDigest(record.image), `image registry id "${record.id}" must use a tagged image reference`)
    assert(typeof record.certificateIdentityRegexp === 'string' && record.certificateIdentityRegexp.trim() !== '', `image registry id "${record.id}" must define certificateIdentityRegexp`)
    assert(typeof record.certificateOidcIssuer === 'string' && record.certificateOidcIssuer.trim() !== '', `image registry id "${record.id}" must define certificateOidcIssuer`)
    assert(isRecord(record.packages), `image registry id "${record.id}" must define packages`)
    if (record.pendingSbom !== undefined) {
      assert(typeof record.pendingSbom === 'boolean', `image registry id "${record.id}" must define pendingSbom as a boolean`)
    }

    if (Object.keys(record.packages).length === 0) {
      assert(record.pendingSbom === true, `image registry id "${record.id}" must define packages unless pendingSbom is true`)
      continue
    }

    for (const [field, packageRecord] of Object.entries(record.packages)) {
      assert(isRecord(packageRecord), `image registry id "${record.id}" package "${field}" must be an object`)
      assert(typeof packageRecord.name === 'string' && packageRecord.name.trim() !== '', `image registry id "${record.id}" package "${field}" must define name and required`)
      assert(typeof packageRecord.required === 'boolean', `image registry id "${record.id}" package "${field}" must define name and required`)
      if (packageRecord.element !== undefined) {
        assert(typeof packageRecord.element === 'string' && packageRecord.element.trim() !== '', `image registry id "${record.id}" package "${field}" must define element as a string`)
      }
      if (packageRecord.type !== undefined) {
        assert(typeof packageRecord.type === 'string' && packageRecord.type.trim() !== '', `image registry id "${record.id}" package "${field}" must define type as a string`)
      }
      if (packageRecord.foundBy !== undefined) {
        assert(typeof packageRecord.foundBy === 'string' && packageRecord.foundBy.trim() !== '', `image registry id "${record.id}" package "${field}" must define foundBy as a string`)
      }
    }
  }
}

export const IMAGE_SBOM_REGISTRY = Object.freeze([
  freezeRecord({
    id: 'bluefin-stable',
    product: 'bluefin',
    required: true,
    image: 'ghcr.io/ublue-os/bluefin:stable',
    certificateIdentityRegexp: '^https://github.com/ublue-os/bluefin/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {
      base: { name: 'kernel-core', type: 'rpm', required: true },
      kernel: { name: 'kernel-core', type: 'rpm', required: true },
      gnome: { name: 'gnome-shell', type: 'rpm', required: true },
      mesa: { name: 'mesa', type: 'rpm', required: false },
      systemd: { name: 'systemd', required: false },
      podman: { name: 'podman', required: false },
      pipewire: { name: 'pipewire', required: false },
      flatpak: { name: 'flatpak', required: false },
    },
  }),
  freezeRecord({
    id: 'bluefin-stable-nvidia',
    product: 'bluefin',
    required: false,
    image: 'ghcr.io/ublue-os/bluefin-nvidia-open:stable',
    certificateIdentityRegexp: '^https://github.com/ublue-os/bluefin/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {
      nvidia: { name: 'nvidia-driver', required: true },
    },
  }),
  freezeRecord({
    id: 'bluefin-lts',
    product: 'bluefin',
    required: true,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/bluefin-lts:stable',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/bluefin-lts/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  }),
  freezeRecord({
    id: 'bluefin-lts-hwe',
    product: 'bluefin',
    required: false,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/bluefin-lts-hwe:stable',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/bluefin-lts/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  }),
  freezeRecord({
    id: 'bluefin-lts-nvidia',
    product: 'bluefin',
    required: false,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/bluefin-lts-nvidia:stable',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/bluefin-lts/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  }),
  freezeRecord({
    id: 'dakota',
    product: 'dakota',
    required: true,
    image: 'ghcr.io/projectbluefin/dakota:latest',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {
      kernel: { name: 'linux', element: 'freedesktop-sdk.bst:components/linux.bst', required: true },
      gnome: { name: 'gnome-shell', required: true },
      mesa: { name: 'mesa', required: true },
      systemd: { name: 'systemd', required: false },
      podman: { name: 'podman', required: false },
      pipewire: { name: 'pipewire', required: false },
      flatpak: { name: 'flatpak', required: false },
      bootc: { name: 'bootc', required: false },
    },
  }),
  freezeRecord({
    id: 'dakota-nvidia',
    product: 'dakota',
    required: false,
    image: 'ghcr.io/projectbluefin/dakota-nvidia:latest',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {
      nvidia: { name: 'NVIDIA-Linux-x86', required: true },
    },
  }),
  freezeRecord({
    id: 'dakota-gaming',
    product: 'dakota',
    required: false,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/dakota-gaming:testing',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  }),
  freezeRecord({
    id: 'dakota-nvidia-gaming',
    product: 'dakota',
    required: false,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/dakota-nvidia-gaming:testing',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  }),
])

validateImageSbomRegistry(IMAGE_SBOM_REGISTRY)
