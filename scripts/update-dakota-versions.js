#!/usr/bin/env node

/**
 * Compatibility wrapper: updates public/dakota-versions.json by calling the
 * shared SBOM verification orchestrator for the Dakota product only.
 *
 * Requires: oras, cosign (installed by update-content.yml), authenticated
 * against ghcr.io.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { projectDakotaVersions } from './lib/dakota-version-projection.js'
import { IMAGE_SBOM_REGISTRY } from './lib/image-sbom-registry.js'
import { verifyRegistry } from './lib/image-version-audit.js'
import { collectVerifiedImageSbom } from './lib/verified-image-sbom.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/dakota-versions.json')

/**
 * Run the shared orchestrator for Dakota records only and project results.
 */
export async function updateProducts({ products = ['dakota'] } = {}) {
  const records = IMAGE_SBOM_REGISTRY.filter(r => products.includes(r.product))
  const auditResult = await verifyRegistry(records, { collectVerifiedImageSbom })

  const current = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  const previousMetadata = {
    isos: current.isos,
    baseline: current.packages?.baseline,
  }

  const projected = projectDakotaVersions(auditResult, previousMetadata)
  fs.writeFileSync(OUT, `${JSON.stringify(projected, null, 2)}\n`)
  console.info('[dakota-versions] wrote', OUT)
  return projected
}

function isMainModule() {
  return process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
}

if (isMainModule()) {
  updateProducts({ products: ['dakota'] }).catch((e) => {
    console.error('[dakota-versions] fatal:', e.message)
    process.exit(1)
  })
}
