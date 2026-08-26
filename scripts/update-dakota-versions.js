#!/usr/bin/env node

/**
 * Compatibility wrapper for the unified image-version updater.
 *
 * The old product-only write path bypassed the atomic audit and field-loss
 * guards. Keep this command as an alias, but always refresh every product
 * through update-image-versions.js.
 */

import { pathToFileURL } from 'node:url'

import { updateImageVersions } from './update-image-versions.js'

/**
 * Run the unified atomic updater.
 */
export async function updateProducts() {
  return updateImageVersions()
}

function isMainModule() {
  return process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
}

if (isMainModule()) {
  updateProducts().catch((e) => {
    console.error('[dakota-versions] fatal:', e.message)
    process.exit(1)
  })
}
