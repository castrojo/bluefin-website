import fs from 'node:fs'
import path from 'node:path'
import { EvidenceError } from './verified-image-sbom.js'
import { extractMappedVersions } from './spdx-version-extractor.js'

/**
 * Verify all registry records by collecting their SBOMs.
 *
 * @param {import('./image-sbom-registry.js').ImageSbomRecord[]} records
 * @param {{
 *   collectVerifiedImageSbom: (record: object, deps: object) => Promise<object>,
 *   now?: () => string,
 *   run?: Function,
 *   fs?: object
 * }} dependencies
 * @returns {Promise<{ checkedAt: string, images: object[] }>}
 */
export async function verifyRegistry(records, dependencies) {
  const {
    collectVerifiedImageSbom,
    now = () => new Date().toISOString(),
    run,
    fs: fsImpl,
  } = dependencies

  const checkedAt = now()
  const collectorDeps = {}
  if (run != null) collectorDeps.run = run
  if (fsImpl != null) collectorDeps.fs = fsImpl

  const images = []

  for (const record of records) {
    if (record.pendingSbom) {
      // Skip images explicitly marked as not yet having SBOMs
      continue
    }

    let collected
    try {
      collected = await collectVerifiedImageSbom(record, collectorDeps)
    } catch (err) {
      if (!(err instanceof EvidenceError)) {
        // Non-evidence errors (programming errors, network failures, etc.) abort
        throw err
      }
      if (record.required) {
        images.push({
          id: record.id,
          product: record.product,
          image: record.image,
          status: 'unavailable',
          error: err.message,
        })
      }
      // Optional image failures are omitted entirely
      continue
    }

    const extraction = extractMappedVersions(collected.sbom, record.packages)

    if (extraction.missingRequired.length > 0) {
      images.push({
        id: record.id,
        product: record.product,
        image: record.image,
        imageDigest: collected.imageDigest,
        sbomDigest: collected.sbomDigest,
        status: 'unavailable',
        missingRequired: extraction.missingRequired,
      })
      continue
    }

    images.push({
      id: record.id,
      product: record.product,
      image: record.image,
      imageDigest: collected.imageDigest,
      sbomDigest: collected.sbomDigest,
      status: 'verified',
      values: extraction.values,
      missingOptional: extraction.missingOptional,
    })
  }

  return { checkedAt, images }
}

/**
 * Summarise verification results grouped by product.
 *
 * @param {{ checkedAt: string, images: object[] }} auditResult
 * @returns {Record<string, { status: 'ok' | 'degraded' | 'unavailable', images: object[] }>}
 */
export function productStatus(auditResult) {
  const byProduct = {}

  for (const image of auditResult.images) {
    const product = image.product
    if (product == null) {
      throw new Error(`audit image entry '${image.id}' is missing a product field`)
    }
    if (!byProduct[product]) {
      byProduct[product] = { images: [] }
    }
    byProduct[product].images.push(image)
  }

  for (const product of Object.keys(byProduct)) {
    const group = byProduct[product]
    const statuses = group.images.map(img => img.status)
    if (statuses.every(s => s === 'verified')) {
      group.status = 'ok'
    } else if (statuses.some(s => s === 'unavailable')) {
      group.status = 'unavailable'
    } else {
      group.status = 'degraded'
    }
  }

  return byProduct
}

/**
 * Write output files atomically using a temp directory, then rename into place.
 *
 * @param {Record<string, unknown>} outputs - filename → content (will be JSON-serialised)
 * @param {string} destinationRoot - directory path for final files
 * @param {{ fs?: object, validate?: (filename: string, content: unknown) => void }} [options]
 */
export function writeOutputsAtomically(outputs, destinationRoot, options = {}) {
  const fsImpl = options.fs ?? fs
  const validate = options.validate ?? null

  // Validate all outputs before touching any files
  if (validate != null) {
    for (const [filename, content] of Object.entries(outputs)) {
      validate(filename, content)
    }
  }

  fsImpl.mkdirSync(destinationRoot, { recursive: true })

  const tmpDir = fsImpl.mkdtempSync(path.join(destinationRoot, '.tmp-'))

  try {
    const staged = []
    for (const [filename, content] of Object.entries(outputs)) {
      const tmpPath = path.join(tmpDir, filename)
      fsImpl.writeFileSync(tmpPath, JSON.stringify(content, null, 2) + '\n', 'utf8')
      staged.push({ tmpPath, finalPath: path.join(destinationRoot, filename) })
    }
    // All writes succeeded; rename into place
    for (const { tmpPath, finalPath } of staged) {
      fsImpl.renameSync(tmpPath, finalPath)
    }
  } finally {
    // Clean up tmp dir (files already renamed out are gone, leftover files mean failure)
    try { fsImpl.rmSync(tmpDir, { recursive: true, force: true }) } catch (_) {}
  }
}
