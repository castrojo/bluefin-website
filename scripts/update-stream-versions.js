#!/usr/bin/env node

/**
 * Update stream-versions.yml from verified OCI image SBOMs.
 *
 * Uses the shared SBOM verification orchestrator against the Bluefin
 * image-sbom-registry entries, then projects results into the public
 * stream-versions.yml shape via bluefin-version-projection.
 *
 * Requires: oras, cosign (installed by update-content.yml), authenticated
 * against ghcr.io.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dump as dumpYaml } from 'js-yaml'

import { projectBluefinStreams } from './lib/bluefin-version-projection.js'
import { IMAGE_SBOM_REGISTRY } from './lib/image-sbom-registry.js'
import { verifyRegistry } from './lib/image-version-audit.js'
import { collectVerifiedImageSbom } from './lib/verified-image-sbom.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/stream-versions.yml')

export function createHeader(today = new Date().toISOString().split('T')[0]) {
  return [
    '# Stream version information for Bluefin releases',
    '# Source: verified OCI image SBOMs (cosign + SPDX referrers)',
    `# Last updated: ${today}`,
    '',
    '',
  ].join('\n')
}

/**
 * Run the shared orchestrator for Bluefin records and project results.
 */
export async function updateProducts({ products = ['bluefin'] } = {}) {
  const records = IMAGE_SBOM_REGISTRY.filter(r => products.includes(r.product))
  const auditResult = await verifyRegistry(records, { collectVerifiedImageSbom })
  const projected = projectBluefinStreams(auditResult)

  // Write YAML with only the stable/lts data (no checkedAt at top level in YAML)
  const yamlData = {}
  if (projected.stable) yamlData.stable = projected.stable
  if (projected.lts) yamlData.lts = projected.lts

  fs.writeFileSync(
    OUT,
    createHeader() + dumpYaml(yamlData, { lineWidth: -1, quotingType: '"', forceQuotes: true }),
  )

  console.info('[stream-versions] wrote', OUT)
  console.info('stable:', projected.stable)
  console.info('lts:', projected.lts)
  return projected
}

function isMainModule() {
  return process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
}

if (isMainModule()) {
  updateProducts({ products: ['bluefin'] }).catch((e) => {
    console.error('[stream-versions] fatal:', e.message)
    process.exit(1)
  })
}
