#!/usr/bin/env node

/**
 * Update stream-versions.yml from the SBOM attestations cache at
 * docs.projectbluefin.io/data/sbom-attestations.json
 *
 * This replaces the previous approach of parsing GitHub release markdown,
 * which was fragile and broke whenever the release note format changed.
 *
 * Stream mapping:
 *   stable.kernel  → bluefin-stable
 *   stable.gnome   → bluefin-stable
 *   stable.mesa    → bluefin-stable
 *   stable.nvidia  → bluefin-nvidia-open-stable
 *
 *   lts.kernel     → bluefin-lts
 *   lts.gnome      → bluefin-lts
 *   lts.mesa       → bluefin-lts
 *   lts.hwe        → bluefin-lts-hwe (kernel field)
 *   lts.nvidia     → bluefin-gdx-lts
 *
 * The sbom-attestations.json is generated nightly by projectbluefin/documentation
 * via cosign-verified OCI SBOM attestations from ghcr.io/ublue-os/bluefin* images.
 */

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dump as dumpYaml } from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/stream-versions.yml')
const SBOM_URL = 'https://docs.projectbluefin.io/data/sbom-attestations.json'
const STABLE_IMAGE = 'ghcr.io/ublue-os/bluefin:stable'

// Pinned cosign release used to verify the image before its SBOM is trusted.
const COSIGN_VERSION = '3.1.3'
// SHA-256 of cosign-linux-amd64 from the v3.1.3 release cosign_checksums.txt.
const COSIGN_LINUX_AMD64_SHA256 = '4629c757b7618056f8ddd7e2625ae9fdd94c0372a65049520bc7d9df9efc7f71'
const COSIGN_IDENTITY_REGEXP = '^https://github.com/(ublue-os|projectbluefin)/'
const COSIGN_OIDC_ISSUER = 'https://token.actions.githubusercontent.com'

export function latestPv(streams, name) {
  const stream = streams[name]
  if (!stream) {
    console.warn(`[stream-versions] stream "${name}" not found in SBOM`)
    return {}
  }
  const releases = stream.releases ?? {}
  const key = Object.keys(releases).find((releaseKey) => {
    const packageVersions = releases[releaseKey]?.packageVersions
    return packageVersions && Object.keys(packageVersions).length > 0
  })
  if (!key) {
    console.warn(`[stream-versions] no releases for stream "${name}"`)
    return {}
  }
  console.info(`[stream-versions] ${name}: using release ${key}`)
  return releases[key]?.packageVersions ?? {}
}

function normalizeRpmVersion(version) {
  return version.replace(/^[^:]+:/, '').replace(/\.fc\d+$/, '')
}

export function extractSbomPackageVersions(sbom) {
  const artifacts = sbom.artifacts ?? []
  const findVersion = (name, all = false) => {
    const versions = artifacts
      .filter(artifact => artifact.name === name && artifact.version)
      .map(artifact => normalizeRpmVersion(artifact.version))
    return all ? [...new Set(versions)].sort().at(-1) : versions[0]
  }
  const kernelRaw = artifacts.find(artifact => artifact.name === 'kernel-core')?.version
  const fedora = kernelRaw?.match(/\.fc(\d+)$/)?.[1]
  return {
    ...(fedora ? { base: `Fedora ${fedora}` } : {}),
    kernel: kernelRaw ? normalizeRpmVersion(kernelRaw) : undefined,
    gnome: findVersion('gnome-shell'),
    mesa: findVersion('mesa', true),
    systemd: findVersion('systemd'),
    podman: findVersion('podman'),
    pipewire: findVersion('pipewire'),
    flatpak: findVersion('flatpak'),
  }
}

/**
 * Return a cosign binary path. Uses PATH when available; otherwise downloads
 * the pinned release and verifies its SHA-256 before executing it.
 */
export function ensureCosign() {
  try {
    execFileSync('cosign', ['version'], { stdio: 'pipe' })
    return 'cosign'
  }
  catch {
    // fall through to pinned download
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosign-pinned-'))
  const bin = path.join(dir, 'cosign')
  const url = `https://github.com/sigstore/cosign/releases/download/v${COSIGN_VERSION}/cosign-linux-amd64`
  execFileSync('curl', ['-sfL', url, '--output', bin], { stdio: 'pipe' })
  const actual = crypto.createHash('sha256').update(fs.readFileSync(bin)).digest('hex')
  if (actual !== COSIGN_LINUX_AMD64_SHA256) {
    throw new Error(`cosign checksum mismatch: expected ${COSIGN_LINUX_AMD64_SHA256}, got ${actual}`)
  }
  fs.chmodSync(bin, 0o755)
  return bin
}

/**
 * Cosign-verify the stable image (keyless, GitHub Actions issuer) and return
 * its manifest digest, so SBOM discovery runs against exactly what verified.
 */
export function verifyImageDigest(cosign, image = STABLE_IMAGE) {
  const out = execFileSync(cosign, [
    'verify',
    image,
    '--certificate-identity-regexp',
    COSIGN_IDENTITY_REGEXP,
    '--certificate-oidc-issuer',
    COSIGN_OIDC_ISSUER,
    '--output',
    'json',
  ], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  const entries = JSON.parse(out)
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`cosign verify returned no signatures for ${image}`)
  }
  const digest = entries[0]?.critical?.image?.['docker-manifest-digest']
  if (!digest) {
    throw new Error('cosign verify output has no docker-manifest-digest')
  }
  return digest
}

function pullStableSbom() {
  const cosign = ensureCosign()
  const verifiedDigest = verifyImageDigest(cosign)
  const pinnedImage = `ghcr.io/ublue-os/bluefin@${verifiedDigest}`
  console.info(`[stream-versions] cosign-verified ${STABLE_IMAGE} → ${pinnedImage}`)
  const discovery = JSON.parse(execFileSync('oras', [
    'discover',
    '--artifact-type',
    'application/vnd.spdx+json',
    '--format',
    'json',
    pinnedImage,
  ], { encoding: 'utf8' }))
  const referrer = discovery.referrers?.find(item => item.artifactType === 'application/vnd.spdx+json')
  if (!referrer?.digest) {
    throw new Error('stable image has no attached SPDX SBOM')
  }
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bluefin-stable-sbom-'))
  try {
    execFileSync('oras', [
      'pull',
      `ghcr.io/ublue-os/bluefin@${referrer.digest}`,
      '--output',
      outputDir,
    ], { stdio: 'pipe' })
    return JSON.parse(fs.readFileSync(path.join(outputDir, 'sbom.json'), 'utf8'))
  }
  finally {
    fs.rmSync(outputDir, { recursive: true, force: true })
  }
}

export function buildStreamVersionData(streams) {
  const stable = latestPv(streams, 'bluefin-stable')
  const lts = latestPv(streams, 'bluefin-lts')
  const ltsHwe = latestPv(streams, 'bluefin-lts-hwe')
  const ltsNvidia = latestPv(streams, 'bluefin-gdx-lts')

  return {
    stable: {
      base: stable.fedora ? `Fedora ${stable.fedora.replace(/^F/, '')}` : 'Fedora 44',
      kernel: stable.kernel ?? 'unknown',
      gnome: stable.gnome ?? 'unknown',
      mesa: stable.mesa ?? 'unknown',
      nvidia: 'unknown',
    },
    lts: {
      base: 'CentOS Stream 10',
      kernel: lts.kernel ?? 'unknown',
      gnome: lts.gnome ?? 'unknown',
      mesa: lts.mesa ?? 'unknown',
      hwe: ltsHwe.kernel ?? 'unknown',
      nvidia: ltsNvidia.nvidia ?? 'unknown',
    },
  }
}

export function createHeader(today = new Date().toISOString().split('T')[0]) {
  return [
    '# Stream version information for Bluefin releases',
    '# Source: docs.projectbluefin.io/data/sbom-attestations.json',
    '#         (cosign-verified OCI SBOM attestations from ghcr.io/ublue-os)',
    `# Last updated: ${today}`,
    '',
    '',
  ].join('\n')
}

function isMainModule() {
  return process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
}

async function main() {
  const res = await fetch(SBOM_URL)
  if (!res.ok) {
    throw new Error(`SBOM fetch failed: ${res.status} ${res.statusText}`)
  }

  const sbom = await res.json()
  const data = buildStreamVersionData(sbom.streams ?? {})

  try {
    const sbomVersions = extractSbomPackageVersions(pullStableSbom())
    data.stable = { ...data.stable, ...sbomVersions }
    console.info('[stream-versions] stable OCI SBOM:', sbomVersions)
  }
  catch (error) {
    throw new Error(`stable OCI SBOM unavailable: ${error.message}`)
  }

  fs.writeFileSync(
    OUT,
    createHeader() + dumpYaml(data, { lineWidth: -1, quotingType: '"', forceQuotes: true }),
  )

  console.info('[stream-versions] wrote', OUT)
  console.info('stable:', data.stable)
  console.info('lts:', data.lts)
}

if (isMainModule()) {
  main().catch((e) => {
    console.error('[stream-versions] fatal:', e.message)
    process.exit(1)
  })
}
