/**
 * Project verified SBOM audit results into the public DakotaVersions shape.
 *
 * Consumes the output of verifyRegistry (keyed by registry ID) and produces
 * the public/dakota-versions.json structure with status, sources, and packages.
 */

import { IMAGE_SBOM_REGISTRY } from './image-sbom-registry.js'

const DAKOTA_IDS = IMAGE_SBOM_REGISTRY
  .filter(r => r.product === 'dakota')
  .map(r => r.id)

/**
 * @param {{ checkedAt: string, images: Array<{ id: string, product?: string, image: string, imageDigest?: string, sbomDigest?: string, status: string, values?: Record<string,string> }> }} auditResult
 * @param {{ isos?: Array<{ label: string, filename: string }>, baseline?: string }} previousMetadata
 * @param {string} [checkedAt] - override timestamp (defaults to auditResult.checkedAt)
 * @returns {{ checkedAt: string, status: 'verified'|'unavailable', sources: Array<{ id: string, image: string, imageDigest: string, sbomDigest: string }>, isos?: Array<{ label: string, filename: string }>, packages: Record<string, string> }}
 */
export function projectDakotaVersions(auditResult, previousMetadata = {}, checkedAt) {
  const timestamp = checkedAt ?? auditResult.checkedAt

  // Filter to dakota images only
  const dakotaImages = auditResult.images.filter(img => DAKOTA_IDS.includes(img.id))

  // Find the base dakota record — required for verified status
  const baseImage = dakotaImages.find(img => img.id === 'dakota')

  if (!baseImage || baseImage.status !== 'verified') {
    return {
      checkedAt: timestamp,
      status: 'unavailable',
      sources: [],
      ...(previousMetadata.isos ? { isos: previousMetadata.isos } : {}),
      packages: {},
    }
  }

  // Collect sources from all verified dakota images
  const sources = dakotaImages
    .filter(img => img.status === 'verified' && img.imageDigest && img.sbomDigest)
    .map(img => ({
      id: img.id,
      image: img.image,
      imageDigest: img.imageDigest,
      sbomDigest: img.sbomDigest,
    }))

  // Build packages: base fields from dakota, nvidia from dakota-nvidia, ogc from dakota-gaming
  const packages = { ...baseImage.values }

  const nvidiaImage = dakotaImages.find(img => img.id === 'dakota-nvidia')
  if (nvidiaImage && nvidiaImage.status === 'verified' && nvidiaImage.values) {
    Object.assign(packages, nvidiaImage.values)
  }

  const gamingImage = dakotaImages.find(img => img.id === 'dakota-gaming')
  if (gamingImage && gamingImage.status === 'verified' && gamingImage.values) {
    Object.assign(packages, gamingImage.values)
  }

  // Preserve baseline metadata
  if (previousMetadata.baseline) {
    packages.baseline = previousMetadata.baseline
  }

  return {
    checkedAt: timestamp,
    status: 'verified',
    sources,
    ...(previousMetadata.isos ? { isos: previousMetadata.isos } : {}),
    packages,
  }
}
