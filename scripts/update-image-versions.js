#!/usr/bin/env node
/**
 * Daily image version verification orchestrator.
 *
 * Single production command that verifies the full image registry once,
 * projects both Bluefin and Dakota version data, and atomically writes
 * all output files.
 *
 * Usage:
 *   node scripts/update-image-versions.js             # verify + write all outputs
 *   node scripts/update-image-versions.js --check-only  # verify and exit non-zero on any unavailable
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { projectBluefinStreams } from './lib/bluefin-version-projection.js'
import { projectDakotaVersions } from './lib/dakota-version-projection.js'
import { IMAGE_SBOM_REGISTRY } from './lib/image-sbom-registry.js'
import { verifyRegistry, writeOutputsAtomically } from './lib/image-version-audit.js'
import { collectVerifiedImageSbom } from './lib/verified-image-sbom.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const checkOnly = process.argv.includes('--check-only')
const DAKOTA_BASELINE = 'x86-64-v3'

// Single registry verification for all products
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
  // Project Bluefin streams
  const bluefinStreams = projectBluefinStreams(result)

  // Project Dakota versions, preserving existing ISO/baseline metadata
  const dakotaOutPath = path.join(projectRoot, 'public', 'dakota-versions.json')
  let previousMetadata = { baseline: DAKOTA_BASELINE }
  try {
    const current = JSON.parse(fs.readFileSync(dakotaOutPath, 'utf8'))
    previousMetadata = {
      isos: current.isos,
      baseline: current.packages?.baseline ?? DAKOTA_BASELINE,
    }
  }
  catch {
    // No existing file; use defaults
  }
  const dakotaVersions = projectDakotaVersions(result, previousMetadata)

  // Write all outputs atomically from project root
  writeOutputsAtomically(
    {
      'public/stream-versions.yml': bluefinStreams,
      'public/dakota-versions.json': dakotaVersions,
      '.cache/website-live-data/sbom-audit.json': result,
    },
    projectRoot,
  )

  console.info('Wrote public/stream-versions.yml')
  console.info('Wrote public/dakota-versions.json')
  console.info('Wrote .cache/website-live-data/sbom-audit.json')
}

if (checkOnly && unavailable.length > 0) {
  process.exit(1)
}
