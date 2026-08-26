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
 * Strip RPM epoch prefix (e.g. `3:`) and Fedora/EL dist-tag suffix
 * (e.g. `.fc44`, `.el10`) from a user-facing version string.
 * Preserves the RPM release segment (`-1`, `-201`).
 *
 * Examples:
 *   "7.1.6-201.fc44"      → "7.1.6-201"
 *   "50.3-1.fc44"         → "50.3-1"
 *   "3:610.57.04-1.fc44"  → "610.57.04-1"
 *   "6.12.0-233.el10"     → "6.12.0-233"  (unchanged — no .el suffix in this form)
 *
 * @param {string} v
 * @returns {string}
 */
export function normalizeUserVersion(v) {
  if (typeof v !== 'string') {
    return v
  }
  let out = v
  // Strip leading numeric epoch (e.g. "3:")
  out = out.replace(/^\d+:/, '')
  // Strip trailing .fcNN or .elNN
  out = out.replace(/\.(?:fc|el)\d+$/, '')
  return out
}

/**
 * Derive the Fedora base version from a kernel-core RPM version string.
 * Example: "7.0.12-201" with suffix ".fc44" → "Fedora 44"
 * The registry extracts versions after normalisation strips .fc suffixes,
 * so we look at the raw SBOM data via the image's values.
 * @param {string|undefined} kernelVersion
 * @returns {string|undefined}
 */
function deriveFedoraBase(kernelVersion) {
  if (!kernelVersion) {
    return undefined
  }
  const match = kernelVersion.match(/\.fc(\d+)$/)
  if (match) {
    return `Fedora ${match[1]}`
  }
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

  /**
   * Normalize all version values in a map for user display.
   * Skips the 'base' key (already human-readable, e.g. "Fedora 44").
   */
  function normalizeVals(vals) {
    const out = {}
    for (const [k, v] of Object.entries(vals)) {
      out[k] = k === 'base' ? v : normalizeUserVersion(v)
    }
    return out
  }

  // Build stable stream
  let stable
  if (stableBase && stableBase.status === 'verified' && stableBase.values) {
    const vals = { ...stableBase.values }

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
      ...normalizeVals(vals),
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
      ...normalizeVals(vals),
    }
  }
  else {
    lts = { status: 'unavailable' }
  }

  return { checkedAt: timestamp, stable, lts }
}
