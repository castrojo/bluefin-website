#!/usr/bin/env node

/**
 * Shared OCI SBOM access for the version updaters.
 *
 * Every Bluefin variant publishes its package inventory as an
 * `application/vnd.spdx+json` referrer on its image. That referrer is the only
 * supported source of version data — parsing upstream `.bst` refs or release
 * notes reports what the *next* build will contain, not what users are running.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { extractMappedVersions, normalizeVersion } from './spdx-version-extractor.js'

export { extractMappedVersions, normalizeVersion }

const SBOM_ARTIFACT_TYPE = 'application/vnd.spdx+json'

/**
 * Resolve the SPDX referrer digest attached to an image.
 * @param {string} image - fully qualified image reference
 * @returns {string} referrer manifest digest
 */
export function discoverSbomDigest(image) {
  const discovery = JSON.parse(execFileSync('oras', [
    'discover',
    '--artifact-type',
    SBOM_ARTIFACT_TYPE,
    '--format',
    'json',
    image,
  ], { encoding: 'utf8' }))

  const referrer = discovery.referrers?.find(item => item.artifactType === SBOM_ARTIFACT_TYPE)
  if (!referrer?.digest) {
    throw new Error(`${image} has no attached SPDX SBOM`)
  }
  return referrer.digest
}

/**
 * Pull and parse the SPDX SBOM attached to an image.
 * @param {string} image - fully qualified image reference, may include a tag
 * @returns {object} parsed SPDX document
 */
export function pullImageSbom(image) {
  const digest = discoverSbomDigest(image)
  const repository = image.replace(/[:@].*$/, '')
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bluefin-sbom-'))
  try {
    execFileSync('oras', [
      'pull',
      `${repository}@${digest}`,
      '--output',
      outputDir,
    ], { stdio: 'pipe' })

    const file = fs.readdirSync(outputDir).find(name => name.endsWith('.json'))
    if (!file) {
      throw new Error(`no JSON document in SBOM referrer for ${image}`)
    }
    return JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf8'))
  }
  finally {
    fs.rmSync(outputDir, { recursive: true, force: true })
  }
}

/**
 * Numeric-segment version comparison, so 7.0.7 sorts above 6.12.40.
 * @param {string} a - left version
 * @param {string} b - right version
 * @returns {number} negative, zero, or positive ordering value
 */
export function compareVersions(a, b) {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}

/**
 * Highest version recorded for an SPDX package name.
 *
 * BuildStream SBOMs list a package once per build element, so the same name can
 * carry several versions (and non-version refs such as commit hashes, which are
 * skipped).
 * @param {object} sbom - parsed SPDX document with a `packages` array
 * @param {string} name - SPDX package name
 * @returns {string|undefined} highest semantic-looking version
 */
/**
 * Compatibility wrapper: return the single unambiguous version for a
 * name-only lookup, or the highest version when only one distinct value
 * survives after hash rejection.
 *
 * Callers that need element-pinned or ambiguity-aware extraction should use
 * extractMappedVersions directly.
 *
 * @param {object} sbom - parsed SPDX document
 * @param {string} name - SPDX package name
 * @returns {string|undefined}
 */
export function spdxPackageVersion(sbom, name) {
  const { values, ambiguous } = extractMappedVersions(sbom, { _field: { name } })
  if (ambiguous.includes('_field')) {
    // Multiple distinct versions — pick the highest for backward compatibility.
    const versions = (sbom.packages ?? [])
      .filter(pkg => pkg.name === name)
      .map(pkg => normalizeVersion(pkg.versionInfo))
      .filter(Boolean)
    if (versions.length === 0) return undefined
    return versions.sort(compareVersions).at(-1)
  }
  return values._field
}
