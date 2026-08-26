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
 *   node scripts/update-image-versions.js --check-only  # verify and exit non-zero on ANY unavailable (including optional pending evidence)
 *
 * Failure model:
 *   - EvidenceError  the publisher did not publish usable evidence. Recorded in
 *                    the audit, sanitized out of the outputs, alerted.
 *   - ToolingError   we could not look (missing binary, timeout, throttled or
 *                    unreachable registry, malformed tool output). Aborts
 *                    before any output is written, so an outage can never
 *                    overwrite published data.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { load as loadYaml } from 'js-yaml'
import { projectBluefinStreams } from './lib/bluefin-version-projection.js'
import { projectDakotaVersions } from './lib/dakota-version-projection.js'
import { IMAGE_SBOM_REGISTRY } from './lib/image-sbom-registry.js'
import {
  annotateLastSuccessful,
  assertExplainedFieldLoss,
  verifyRegistry,
  writeOutputsAtomically,
} from './lib/image-version-audit.js'
import { collectVerifiedImageSbom, ToolingError } from './lib/verified-image-sbom.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const DAKOTA_BASELINE = 'x86-64-v3'
const AUDIT_RELATIVE_PATH = '.cache/website-live-data/sbom-audit.json'

/**
 * Read a generated file, returning undefined when it is absent or unreadable.
 * @param {string} filePath
 * @param {(raw: string) => unknown} parse
 * @returns {any}
 */
function readGenerated(filePath, parse) {
  try {
    return parse(fs.readFileSync(filePath, 'utf8'))
  }
  catch {
    return undefined
  }
}

/**
 * Verify every registered image and atomically refresh all public projections.
 *
 * @param {{ checkOnly?: boolean }} [options]
 */
export async function updateImageVersions({ checkOnly = false } = {}) {
  const streamsOutPath = path.join(projectRoot, 'public', 'stream-versions.yml')
  const dakotaOutPath = path.join(projectRoot, 'public', 'dakota-versions.json')
  const auditOutPath = path.join(projectRoot, ...AUDIT_RELATIVE_PATH.split('/'))

  const previousStreams = readGenerated(streamsOutPath, raw => loadYaml(raw))
  const previousDakota = readGenerated(dakotaOutPath, raw => JSON.parse(raw))
  const previousAudit = readGenerated(auditOutPath, raw => JSON.parse(raw))

  // Single registry verification for all products
  const verified = await verifyRegistry(IMAGE_SBOM_REGISTRY, {
    collectVerifiedImageSbom,
  })
  const result = annotateLastSuccessful(verified, previousAudit)

  const unavailable = result.images.filter(img => img.status === 'unavailable')
  const degraded = result.images.filter(img => img.status === 'degraded')

  if (unavailable.length > 0) {
    console.warn('Unavailable images:')
    for (const img of unavailable) {
      console.warn(`  ${img.id}: ${img.errorCode ?? 'unknown'} — ${img.error ?? ''}`)
    }
  }
  if (degraded.length > 0) {
    console.warn('Degraded images (verified values kept, unresolved fields omitted):')
    for (const img of degraded) {
      console.warn(`  ${img.id}: ${img.errorCode ?? 'unknown'} — ${img.error ?? ''}`)
    }
  }

  if (!checkOnly) {
    // Project Bluefin streams
    const bluefinStreams = projectBluefinStreams(result)

    // Project Dakota versions, preserving existing ISO/baseline metadata
    const dakotaVersions = projectDakotaVersions(result, {
      isos: previousDakota?.isos,
      baseline: previousDakota?.packages?.baseline ?? DAKOTA_BASELINE,
    })

    // A published field may only disappear because the audit says its evidence
    // did. Anything else means the verifier broke, and a broken verifier must
    // not promote its own output.
    assertExplainedFieldLoss({
      label: 'public/stream-versions.yml stable',
      product: 'bluefin',
      previous: previousStreams?.stable,
      next: bluefinStreams.stable,
      nextStatus: bluefinStreams.stable?.status,
      audit: result,
    })
    assertExplainedFieldLoss({
      label: 'public/stream-versions.yml lts',
      product: 'bluefin',
      previous: previousStreams?.lts,
      next: bluefinStreams.lts,
      nextStatus: bluefinStreams.lts?.status,
      audit: result,
      aliases: { hwe: 'kernel' },
    })
    assertExplainedFieldLoss({
      label: 'public/dakota-versions.json packages',
      product: 'dakota',
      previous: previousDakota?.packages,
      next: dakotaVersions.packages,
      nextStatus: dakotaVersions.status,
      audit: result,
      ignore: ['baseline'],
    })

    // Write all outputs atomically from project root
    writeOutputsAtomically(
      {
        'public/stream-versions.yml': bluefinStreams,
        'public/dakota-versions.json': dakotaVersions,
        [AUDIT_RELATIVE_PATH]: result,
      },
      projectRoot,
    )

    console.info('Wrote public/stream-versions.yml')
    console.info('Wrote public/dakota-versions.json')
    console.info(`Wrote ${AUDIT_RELATIVE_PATH}`)
  }

  if (checkOnly && unavailable.length > 0) {
    process.exit(1)
  }
}

function isMainModule() {
  return process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
}

if (isMainModule()) {
  try {
    await updateImageVersions({ checkOnly: process.argv.includes('--check-only') })
  }
  catch (err) {
    if (err instanceof ToolingError) {
      console.error(`Blocked: ${err.tool} could not complete verification (${err.code}).`)
      console.error(err.message)
      console.error('No output file, cache entry, or deployment was updated.')
      process.exit(2)
    }
    throw err
  }
}
