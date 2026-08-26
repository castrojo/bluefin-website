import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

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
 * A failure of the verification machinery itself: a missing binary, a timeout,
 * a transport error, a throttled or broken registry, or output the tool was
 * supposed to produce and did not.
 *
 * It is deliberately NOT an EvidenceError. An EvidenceError means the
 * publisher did not publish the evidence, and sanitizes the affected fields out
 * of the website. A ToolingError means we could not look, so it must abort the
 * run before any output, cache, or deployment is touched — a network blip must
 * never be published as "this product has no verified versions".
 */
export class ToolingError extends Error {
  constructor(code, tool, message) {
    super(message)
    this.name = 'ToolingError'
    this.code = code
    this.tool = tool
  }
}

/** Every text surface a child-process failure can hide its cause in. */
function failureText(err) {
  return [err?.message, err?.stderr, err?.stdout]
    .map(part => (typeof part === 'string' ? part : (part?.toString?.() ?? '')))
    .join('\n')
}

const TIMEOUT_PATTERN = /timed out|timeout|context deadline exceeded/i
const THROTTLE_PATTERN = /\b(?:429|500|502|503|504)\b|too ?many ?requests|internal server error|service unavailable|bad gateway|gateway time-?out/i
const TRANSPORT_PATTERN = /ECONNRESET|ECONNREFUSED|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|EPIPE|connection refused|connection reset|no such host|network is unreachable|i\/o timeout|dial tcp|tls: handshake failure|remote error: tls|certificate signed by unknown authority/i
const ABSENCE_PATTERN = /NAME_UNKNOWN|MANIFEST_UNKNOWN|manifest unknown|name unknown|repository name not known|\bnot found\b|\b404\b/i

/**
 * Classify a child-process failure as a tooling/transport failure.
 *
 * @param {any} err - error thrown by the run function
 * @param {string} tool - binary that failed, for the message
 * @returns {ToolingError|null} null when the failure is not identifiably a
 *   tooling failure and the caller should apply its own evidence rules
 */
export function classifyToolFailure(err, tool) {
  const text = failureText(err)

  if (err?.code === 'ENOENT' && String(err?.syscall ?? '').startsWith('spawn')) {
    return new ToolingError('tool-missing', tool, `${tool} is not installed or not on PATH: ${text}`)
  }
  if (err?.code === 'ETIMEDOUT' || err?.killed === true || err?.signal != null || TIMEOUT_PATTERN.test(text)) {
    return new ToolingError('tool-timeout', tool, `${tool} timed out: ${text}`)
  }
  if (THROTTLE_PATTERN.test(text)) {
    return new ToolingError('registry-unavailable', tool, `registry rejected the ${tool} request: ${text}`)
  }
  if (TRANSPORT_PATTERN.test(text)) {
    return new ToolingError('transport', tool, `${tool} could not reach the registry: ${text}`)
  }
  if (typeof err?.code === 'string' && ['EACCES', 'EIO', 'ENOSPC', 'EMFILE', 'ENOENT'].includes(err.code)) {
    return new ToolingError('tool-io', tool, `${tool} failed with a local I/O error (${err.code}): ${text}`)
  }
  return null
}

/**
 * Decide whether a registry failure text describes a genuinely absent artifact.
 *
 * @param {any} err
 * @returns {boolean}
 */
function describesAbsence(err) {
  return ABSENCE_PATTERN.test(failureText(err))
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
  }
  catch (err) {
    const tooling = classifyToolFailure(err, 'oras')
    if (tooling != null) {
      throw tooling
    }
    if (describesAbsence(err)) {
      throw new EvidenceError('image-not-found', image, `Cannot resolve ${image}: ${failureText(err)}`)
    }
    throw new ToolingError('tool-failure', 'oras', `oras manifest fetch failed for ${image}: ${failureText(err)}`)
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
  }
  catch (err) {
    const tooling = classifyToolFailure(err, 'oras')
    if (tooling != null) {
      throw tooling
    }
    if (describesAbsence(err)) {
      throw new EvidenceError('image-not-found', imageAtDigest, `Cannot discover referrers for ${imageAtDigest}: ${failureText(err)}`)
    }
    throw new ToolingError('tool-failure', 'oras', `oras discover failed for ${imageAtDigest}: ${failureText(err)}`)
  }
  let result
  try {
    result = JSON.parse(raw)
  }
  catch (err) {
    // The tool owns this document; unparseable output means the tool, not the
    // publisher, is broken.
    throw new ToolingError('malformed-output', 'oras', `Malformed oras discovery JSON for ${imageAtDigest}: ${err.message}`)
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
      '--type',
      'https://slsa.dev/provenance/v1',
      '--certificate-identity-regexp',
      policy.certificateIdentityRegexp,
      '--certificate-oidc-issuer',
      policy.certificateOidcIssuer,
      imageAtDigest,
    ], { encoding: 'utf8' })
  }
  catch (err) {
    const tooling = classifyToolFailure(err, 'cosign')
    if (tooling != null) {
      throw tooling
    }
    const msg = failureText(err)
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
  }
  catch (err) {
    if (err instanceof EvidenceError || err instanceof ToolingError) {
      throw err
    }
    const tooling = classifyToolFailure(err, 'oras')
    if (tooling != null) {
      throw tooling
    }
    if (describesAbsence(err) || err instanceof SyntaxError) {
      // The referrer was discovered but its artifact is absent or corrupt:
      // that is a publisher problem, so it sanitizes rather than blocks.
      throw new EvidenceError('invalid-sbom', repository, `Failed to read SPDX referrer ${digest}: ${failureText(err)}`)
    }
    throw new ToolingError('tool-failure', 'oras', `oras pull failed for ${repository}@${digest}: ${failureText(err)}`)
  }
  finally {
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
