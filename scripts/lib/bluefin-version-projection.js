/**
 * Project verified SBOM audit results into the public stream-versions.yml shape.
 *
 * Consumes the output of verifyRegistry (keyed by registry ID) and produces
 * the { checkedAt, stable, lts } structure with status and package versions.
 */

import { IMAGE_SBOM_REGISTRY } from './image-sbom-registry.js'

const BLUEFIN_IDS = IMAGE_SBOM_REGISTRY
  .filter(r => r.product === 'bluefin')
  .map(r => r.id)

/**
 * Derive the Fedora base version from a kernel-core RPM version string.
 * Example: "7.0.12-201" with suffix ".fc44" → "Fedora 44"
 * The registry extracts versions after normalisation strips .fc suffixes,
 * so we look at the raw SBOM data via the image's values.
 * @param {string|undefined} kernelVersion
 * @returns {string|undefined}
 */
function deriveFedoraBase(kernelVersion) {
  if (!kernelVersion) return undefined
  const match = kernelVersion.match(/\.fc(\d+)$/)
  if (match) return `Fedora ${match[1]}`
  return undefined
}

/**
 * @param {{ checkedAt: string, images: Array<{ id: string, product?: string, image: string, imageDigest?: string, sbomDigest?: string, status: string, values?: Record<string,string>, rawKernelVersion?: string }> }} auditResult
 * @param {string} [checkedAt] - override timestamp
 * @returns {{ checkedAt: string, stable: object, lts: object }}
 */
export function projectBluefinStreams(auditResult, checkedAt) {
  const timestamp = checkedAt ?? auditResult.checkedAt

  const bluefinImages = auditResult.images.filter(img => BLUEFIN_IDS.includes(img.id))

  const stableBase = bluefinImages.find(img => img.id === 'bluefin-stable')
  const stableNvidia = bluefinImages.find(img => img.id === 'bluefin-stable-nvidia')
  const ltsBase = bluefinImages.find(img => img.id === 'bluefin-lts')
  const ltsHwe = bluefinImages.find(img => img.id === 'bluefin-lts-hwe')
  const ltsNvidia = bluefinImages.find(img => img.id === 'bluefin-lts-nvidia')

  // Build stable stream
  let stable
  if (stableBase && stableBase.status === 'verified' && stableBase.values) {
    const vals = { ...stableBase.values }

    // Derive base from the 'base' field which is the raw kernel-core version
    // The registry maps the 'base' field to kernel-core; its normalised value
    // contains the fc suffix needed for derivation.
    if (vals.base) {
      const fedora = deriveFedoraBase(vals.base)
      if (fedora) {
        vals.base = fedora
      }
    }

    // Merge nvidia from its dedicated image
    if (stableNvidia && stableNvidia.status === 'verified' && stableNvidia.values) {
      Object.assign(vals, stableNvidia.values)
    }

    stable = {
      status: 'verified',
      ...vals,
    }
  }
  else {
    stable = { status: 'unavailable' }
  }

  // Build LTS stream
  let lts
  if (ltsBase && ltsBase.status === 'verified' && ltsBase.values) {
    const vals = { ...ltsBase.values }

    if (ltsHwe && ltsHwe.status === 'verified' && ltsHwe.values) {
      vals.hwe = ltsHwe.values.kernel
    }
    if (ltsNvidia && ltsNvidia.status === 'verified' && ltsNvidia.values) {
      Object.assign(vals, ltsNvidia.values)
    }

    lts = {
      status: 'verified',
      ...vals,
    }
  }
  else {
    lts = { status: 'unavailable' }
  }

  return { checkedAt: timestamp, stable, lts }
}
