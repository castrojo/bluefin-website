import fs from 'node:fs'
import path from 'node:path'
import { dump as dumpYaml } from 'js-yaml'
import { extractMappedVersions } from './spdx-version-extractor.js'
import { EvidenceError } from './verified-image-sbom.js'

/**
 * Fields that appear in a generated output block but are never derived from an
 * image SBOM, so their disappearance is not evidence loss.
 */
const NON_SBOM_FIELDS = new Set(['status', 'checkedAt', 'sources', 'isos'])

/**
 * Partition extraction results into required and optional ambiguity.
 *
 * @param {string[]} ambiguous
 * @param {Record<string, {required: boolean}>} packages
 * @returns {{ ambiguousRequired: string[], ambiguousOptional: string[] }}
 */
function partitionAmbiguous(ambiguous, packages) {
  const ambiguousRequired = []
  const ambiguousOptional = []
  for (const field of ambiguous) {
    if (packages[field]?.required) {
      ambiguousRequired.push(field)
    }
    else {
      ambiguousOptional.push(field)
    }
  }
  return { ambiguousRequired, ambiguousOptional }
}

/**
 * Verify all registry records by collecting their SBOMs.
 *
 * Status vocabulary:
 *   - `verified`    every mapped field resolved to exactly one accepted value.
 *   - `degraded`    every required field resolved, but at least one optional
 *                   field was missing or ambiguous. Verified values are kept;
 *                   unresolved fields are omitted and alerted.
 *   - `unavailable` evidence is missing, a required field is missing or
 *                   ambiguous, or the record has no package mapping yet.
 *                   No `values` are published from such an entry.
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
  if (run != null) {
    collectorDeps.run = run
  }
  if (fsImpl != null) {
    collectorDeps.fs = fsImpl
  }

  const images = []

  for (const record of records) {
    const fields = Object.keys(record.packages ?? {})
    const identity = {
      id: record.id,
      product: record.product,
      image: record.image,
      required: record.required,
      fields,
    }

    let collected
    try {
      collected = await collectVerifiedImageSbom(record, collectorDeps)
    }
    catch (err) {
      if (!(err instanceof EvidenceError)) {
        // Tooling, transport, and programming failures abort the whole run:
        // they cannot be distinguished from broken verification, so they must
        // never sanitize a public output.
        throw err
      }
      images.push({
        ...identity,
        status: 'unavailable',
        errorCode: err.code,
        error: err.message,
      })
      continue
    }

    // A record with no package mapping can never produce verified values, even
    // once the image starts publishing an SPDX referrer. Keep the resolved
    // digests so the alert can point at the exact artifact awaiting a mapping.
    if (record.pendingSbom === true || fields.length === 0) {
      images.push({
        ...identity,
        imageDigest: collected.imageDigest,
        sbomDigest: collected.sbomDigest,
        status: 'unavailable',
        errorCode: 'pending-mapping',
        error: `${record.image} publishes an SBOM but has no reviewed package mapping yet`,
      })
      continue
    }

    const extraction = extractMappedVersions(collected.sbom, record.packages)
    const { ambiguousRequired, ambiguousOptional } = partitionAmbiguous(extraction.ambiguous, record.packages)

    const evidence = {
      ...identity,
      imageDigest: collected.imageDigest,
      sbomDigest: collected.sbomDigest,
      missingRequired: extraction.missingRequired,
      missingOptional: extraction.missingOptional,
      ambiguousRequired,
      ambiguousOptional,
      rejected: extraction.rejected,
    }

    if (extraction.missingRequired.length > 0 || ambiguousRequired.length > 0) {
      const errorCode = extraction.missingRequired.length > 0 ? 'missing-required' : 'ambiguous-required'
      const detail = extraction.missingRequired.length > 0
        ? `missing required fields: ${extraction.missingRequired.join(', ')}`
        : `ambiguous required fields: ${ambiguousRequired.join(', ')}`
      images.push({
        ...evidence,
        status: 'unavailable',
        errorCode,
        error: `${record.image} has ${detail}`,
      })
      continue
    }

    if (extraction.missingOptional.length > 0 || ambiguousOptional.length > 0) {
      const errorCode = ambiguousOptional.length > 0 ? 'ambiguous-optional' : 'missing-optional'
      const detail = ambiguousOptional.length > 0
        ? `ambiguous optional fields: ${ambiguousOptional.join(', ')}`
        : `missing optional fields: ${extraction.missingOptional.join(', ')}`
      images.push({
        ...evidence,
        status: 'degraded',
        errorCode,
        error: `${record.image} has ${detail}`,
        values: extraction.values,
      })
      continue
    }

    images.push({
      ...evidence,
      status: 'verified',
      values: extraction.values,
    })
  }

  return { checkedAt, images }
}

/**
 * Copy the previous run's verification timestamp onto entries that failed or
 * degraded in this run, so an alert can state when the evidence last held.
 *
 * Pure: returns a new audit object and never mutates its inputs.
 *
 * @param {{ checkedAt: string, images: object[] }} auditResult
 * @param {{ checkedAt?: string, images?: object[] } | null | undefined} previousAudit
 * @returns {{ checkedAt: string, images: object[] }}
 */
export function annotateLastSuccessful(auditResult, previousAudit) {
  const previousById = new Map(
    (previousAudit?.images ?? [])
      .filter(img => img.status === 'verified' || img.status === 'degraded')
      .map(img => [img.id, img]),
  )
  const previousCheckedAt = previousAudit?.checkedAt

  return {
    ...auditResult,
    images: auditResult.images.map((image) => {
      if (image.status === 'verified') {
        return { ...image }
      }
      const previous = previousById.get(image.id)
      const lastSuccessfulAt = previous?.checkedAt ?? previousCheckedAt
      if (previous == null || lastSuccessfulAt == null) {
        return { ...image }
      }
      return { ...image, lastSuccessfulAt }
    }),
  }
}

/**
 * Collect, per product, every field whose absence the current audit explains.
 *
 * @param {{ images: object[] }} auditResult
 * @param {string} product
 * @returns {Set<string>}
 */
function explainedFields(auditResult, product) {
  const explained = new Set()
  for (const image of auditResult.images ?? []) {
    if (image.product !== product) {
      continue
    }
    for (const field of [
      ...(image.missingRequired ?? []),
      ...(image.missingOptional ?? []),
      ...(image.ambiguousRequired ?? []),
      ...(image.ambiguousOptional ?? []),
    ]) {
      explained.add(field)
    }
    if (image.status === 'unavailable') {
      for (const field of image.fields ?? []) {
        explained.add(field)
      }
    }
  }
  return explained
}

/**
 * Fail before promotion when a public field disappears without matching
 * evidence in the audit.
 *
 * A verified pipeline only ever loses a field because the SBOM stopped
 * carrying it (missing), stopped resolving it uniquely (ambiguous), or because
 * the whole image lost its evidence (unavailable/degraded). Any other loss
 * means the checker, the registry, or the projection broke, and a broken
 * checker must never overwrite published data.
 *
 * @param {{
 *   label: string,
 *   product: string,
 *   previous: Record<string, unknown>,
 *   next: Record<string, unknown>,
 *   audit: { images: object[] },
 *   aliases?: Record<string, string>,
 *   ignore?: string[],
 * }} options
 */
export function assertExplainedFieldLoss(options) {
  const { label, product, previous, next, audit, aliases = {}, ignore = [] } = options
  if (previous == null || next == null) {
    return
  }

  const ignored = new Set([...NON_SBOM_FIELDS, ...ignore])
  const removed = Object.keys(previous).filter(key => !ignored.has(key) && !(key in next))
  if (removed.length === 0) {
    return
  }

  // An explicitly unavailable block is itself the evidence record: the product
  // has a failed image and the projection published no values at all.
  const productUnavailable = (audit.images ?? []).some(
    img => img.product === product && img.status === 'unavailable',
  )
  if (next.status === 'unavailable' && productUnavailable) {
    return
  }

  const explained = explainedFields(audit, product)
  const unexplained = removed.filter(field => !explained.has(field) && !explained.has(aliases[field]))

  if (unexplained.length > 0) {
    throw new Error(
      `unexplained field loss in ${label}: ${unexplained.join(', ')}. `
      + `The audit records no missing, ambiguous, degraded, or unavailable evidence for these fields, `
      + `so the verifier — not the published SBOM — changed. Refusing to promote.`,
    )
  }
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
    }
    else {
      const hasRequiredUnavailable = group.images.some(img => img.status === 'unavailable' && img.required)
      if (hasRequiredUnavailable) {
        group.status = 'unavailable'
      }
      else {
        group.status = 'degraded'
      }
    }
  }

  return byProduct
}

const DEFAULT_SERIALIZERS = {
  '.json': content => `${JSON.stringify(content, null, 2)}\n`,
  '.yml': content => dumpYaml(content, { lineWidth: -1 }),
  '.yaml': content => dumpYaml(content, { lineWidth: -1 }),
}

/**
 * Write output files atomically using a temp directory, then rename into place.
 *
 * Supports nested paths in filenames (e.g. 'public/stream-versions.yml') and
 * selects a serializer by file extension. Defaults: .json → JSON.stringify,
 * .yml/.yaml → js-yaml dump.
 *
 * @param {Record<string, unknown>} outputs - filename → content
 * @param {string} destinationRoot - directory path for final files
 * @param {{ fs?: object, validate?: (filename: string, content: unknown) => void, serializers?: Record<string, (content: unknown) => string> }} [options]
 */
export function writeOutputsAtomically(outputs, destinationRoot, options = {}) {
  const fsImpl = options.fs ?? fs
  const validate = options.validate ?? null
  const serializers = options.serializers ?? DEFAULT_SERIALIZERS

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
      const ext = path.extname(filename)
      const serialize = serializers[ext]
      if (!serialize) {
        throw new Error(`No serializer registered for extension '${ext}' (file: ${filename})`)
      }
      const tmpPath = path.join(tmpDir, filename)
      // Create nested directories within staging dir if needed
      const tmpFileDir = path.dirname(tmpPath)
      if (tmpFileDir !== tmpDir) {
        fsImpl.mkdirSync(tmpFileDir, { recursive: true })
      }
      fsImpl.writeFileSync(tmpPath, serialize(content), 'utf8')
      staged.push({ tmpPath, finalPath: path.join(destinationRoot, filename) })
    }
    // Ensure final directories exist
    for (const { finalPath } of staged) {
      const finalDir = path.dirname(finalPath)
      if (finalDir !== destinationRoot) {
        fsImpl.mkdirSync(finalDir, { recursive: true })
      }
    }
    // All writes succeeded; rename into place
    for (const { tmpPath, finalPath } of staged) {
      fsImpl.renameSync(tmpPath, finalPath)
    }
  }
  finally {
    // Clean up tmp dir (files already renamed out are gone, leftover files mean failure)
    try {
      fsImpl.rmSync(tmpDir, { recursive: true, force: true })
    }
    catch { /* best-effort cleanup */ }
  }
}
