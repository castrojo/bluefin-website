import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SPDX_ARTIFACT_TYPE = 'application/vnd.spdx+json'

export class EvidenceError extends Error {
  constructor(code, image, message) {
    super(message)
    this.name = 'EvidenceError'
    this.code = code
    this.image = image
  }
}

/**
 * Resolve a tagged image reference to its immutable digest form.
 * @param {string} image - fully qualified image with tag or digest
 * @param {Function} run - execFileSync-compatible function
 * @returns {string} repository@sha256:... reference
 */
export function resolveImageDigest(image, run = execFileSync) {
  try {
    const result = JSON.parse(run('oras', ['manifest', 'fetch', '--descriptor', image], { encoding: 'utf8' }))
    const repository = image.replace(/[:@].*$/, '')
    return `${repository}@${result.digest}`
  } catch (err) {
    throw new EvidenceError('image-not-found', image, `Cannot resolve ${image}: ${err.message}`)
  }
}

/**
 * Enumerate all OCI referrers attached to an image digest.
 * @param {string} imageAtDigest - repository@sha256:... reference
 * @param {Function} run - execFileSync-compatible function
 * @returns {Array} referrers array
 */
export function discoverReferrers(imageAtDigest, run = execFileSync) {
  let raw
  try {
    raw = run('oras', ['discover', '--format', 'json', imageAtDigest], { encoding: 'utf8' })
  } catch (err) {
    throw new EvidenceError('image-not-found', imageAtDigest, `Cannot discover referrers for ${imageAtDigest}: ${err.message}`)
  }
  let result
  try {
    result = JSON.parse(raw)
  } catch (err) {
    throw new EvidenceError('invalid-sbom', imageAtDigest, `Malformed discovery JSON for ${imageAtDigest}: ${err.message}`)
  }
  return result.referrers ?? []
}

/**
 * Verify SLSA provenance attestation via cosign.
 * @param {string} imageAtDigest - repository@sha256:... reference
 * @param {{ certificateIdentityRegexp: string, certificateOidcIssuer: string }} policy
 * @param {Function} run - execFileSync-compatible function
 */
export function verifyImageProvenance(imageAtDigest, policy, run = execFileSync) {
  try {
    run('cosign', [
      'verify-attestation',
      '--type', 'slsaprovenance',
      '--certificate-identity-regexp', policy.certificateIdentityRegexp,
      '--certificate-oidc-issuer', policy.certificateOidcIssuer,
      imageAtDigest,
    ], { encoding: 'utf8' })
  } catch (err) {
    const msg = (err.message ?? '') + (err.stderr ?? '')
    if (/no matching attestation|no attestations|not found/i.test(msg)) {
      throw new EvidenceError('missing-provenance', imageAtDigest, `No provenance attestation found for ${imageAtDigest}: ${msg}`)
    }
    throw new EvidenceError('invalid-provenance', imageAtDigest, `Provenance verification failed for ${imageAtDigest}: ${msg}`)
  }
}

/**
 * Pull and parse an SPDX referrer by its digest.
 * @param {string} repository - image repository without tag/digest
 * @param {string} digest - sha256:... digest of the SPDX referrer
 * @param {Function} run - execFileSync-compatible function
 * @param {object} fsImpl - fs module (for testing injection)
 * @returns {object} parsed SPDX document
 */
export function pullSpdxReferrer(repository, digest, run = execFileSync, fsImpl = fs) {
  const outputDir = fsImpl.mkdtempSync(path.join(os.tmpdir(), 'website-sbom-'))
  try {
    run('oras', ['pull', `${repository}@${digest}`, '--output', outputDir], { encoding: 'utf8' })
    const files = fsImpl.readdirSync(outputDir)
    const jsonFile = files.find(name => name.endsWith('.json'))
    if (!jsonFile) {
      throw new EvidenceError('invalid-sbom', repository, `No JSON file in SBOM referrer for ${repository}@${digest}`)
    }
    return JSON.parse(fsImpl.readFileSync(path.join(outputDir, jsonFile), 'utf8'))
  } catch (err) {
    if (err instanceof EvidenceError) throw err
    throw new EvidenceError('invalid-sbom', repository, `Failed to pull SPDX referrer ${digest}: ${err.message}`)
  } finally {
    fsImpl.rmSync(outputDir, { recursive: true, force: true })
  }
}

/**
 * Collect and verify a complete SBOM for an image registry record.
 * @param {import('./image-sbom-registry.js').ImageSbomRecord} record
 * @param {{ run?: Function, fs?: object }} dependencies
 * @returns {Promise<{ id, image, imageDigest, sbomDigest, checkedAt, sbom }>}
 */
export async function collectVerifiedImageSbom(record, dependencies = {}) {
  const run = dependencies.run ?? execFileSync
  const fsImpl = dependencies.fs ?? fs

  const imageAtDigest = resolveImageDigest(record.image, run)
  const imageDigest = imageAtDigest.split('@')[1]

  const referrers = discoverReferrers(imageAtDigest, run)

  const spdxReferrers = referrers.filter(r => r.artifactType === SPDX_ARTIFACT_TYPE)

  if (spdxReferrers.length === 0) {
    throw new EvidenceError('missing-sbom', record.image, `No SPDX referrer found for ${record.image}`)
  }
  if (spdxReferrers.length > 1) {
    throw new EvidenceError('ambiguous-sbom', record.image, `Multiple SPDX referrers found for ${record.image}`)
  }

  const sbomReferrer = spdxReferrers[0]
  const sbomDigest = sbomReferrer.digest

  verifyImageProvenance(imageAtDigest, {
    certificateIdentityRegexp: record.certificateIdentityRegexp,
    certificateOidcIssuer: record.certificateOidcIssuer,
  }, run)

  const repository = record.image.replace(/[:@].*$/, '')
  const sbom = pullSpdxReferrer(repository, sbomDigest, run, fsImpl)

  return {
    id: record.id,
    image: record.image,
    imageDigest,
    sbomDigest,
    checkedAt: new Date().toISOString(),
    sbom,
  }
}
