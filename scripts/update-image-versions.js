#!/usr/bin/env node
/**
 * Daily image version verification orchestrator.
 *
 * Usage:
 *   node scripts/update-image-versions.js           # write .cache/website-live-data/sbom-audit.json
 *   node scripts/update-image-versions.js --check-only  # verify and exit non-zero on any unavailable
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { IMAGE_SBOM_REGISTRY } from './lib/image-sbom-registry.js'
import { collectVerifiedImageSbom } from './lib/verified-image-sbom.js'
import { verifyRegistry, writeOutputsAtomically } from './lib/image-version-audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const destinationRoot = path.join(projectRoot, '.cache', 'website-live-data')

const checkOnly = process.argv.includes('--check-only')

const result = await verifyRegistry(IMAGE_SBOM_REGISTRY, {
  collectVerifiedImageSbom,
})

const unavailable = result.images.filter(img => img.status === 'unavailable')
if (unavailable.length > 0) {
  console.warn('Unavailable images:')
  for (const img of unavailable) {
    console.warn(`  ${img.id}: ${img.error ?? JSON.stringify(img.missingRequired)}`)
  }
}

if (!checkOnly) {
  writeOutputsAtomically({ 'sbom-audit.json': result }, destinationRoot)
  console.log(`Wrote ${path.join(destinationRoot, 'sbom-audit.json')}`)
}

if (checkOnly && unavailable.length > 0) {
  process.exit(1)
}
