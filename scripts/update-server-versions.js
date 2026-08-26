#!/usr/bin/env node

/**
 * Updates server-versions.json from the SPDX SBOM attached to the published
 * Bluefin Server image.
 *
 * This script previously fetched Flatcar Container Linux release streams and
 * wrote docker/containerd/ignition/etcd fields. That was wrong: Bluefin Server
 * is an FSDK/BuildStream 2, DDI-first, distroless OS that merely targets the
 * same space as Flatcar. It ships none of those components, and the numbers it
 * reported belonged to a different operating system.
 *
 * Bluefin Server does not publish a container image yet, so there is no SBOM to
 * read and this script exits non-zero by design. That failure is the signal to
 * add SBOM publishing to projectbluefin/server — it is not a reason to
 * reintroduce a substitute data source.
 *
 * Requires: oras, authenticated against ghcr.io.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { pullImageSbom, spdxPackageVersion } from './lib/oci-sbom.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/server-versions.json')

const SERVER_IMAGE = process.env.BLUEFIN_SERVER_IMAGE ?? 'ghcr.io/projectbluefin/server:latest'

// server-versions.json field → SPDX package name.
const SERVER_PACKAGES = {
  kernel: 'linux',
  systemd: 'systemd',
  k3s: 'k3s',
}

/**
 * Read the mapped package versions out of the server SPDX document.
 * @param {object} sbom - parsed SPDX document
 * @returns {Record<string, string>} resolved versions, omitting misses
 */
export function versionsFromSbom(sbom) {
  const resolved = {}
  for (const [field, packageName] of Object.entries(SERVER_PACKAGES)) {
    const version = spdxPackageVersion(sbom, packageName)
    if (version) {
      resolved[field] = version
      console.info(`[server-versions] ${field} -> ${version}`)
    }
    else {
      console.warn(`[server-versions] no version for "${packageName}"`)
    }
  }
  return resolved
}

/**
 * Build the document written to server-versions.json.
 *
 * Bluefin Server has no application version of its own — per that repo's
 * docs/skills/bump-fsdk-version.md the version axis IS the FSDK release, which
 * the image declares in its io.projectbluefin.fsdk.version label.
 * @param {Record<string, string>} versions - SBOM-derived package versions
 * @param {string} fsdkVersion - FSDK release the image was built from
 * @param {string} generatedAt - ISO timestamp to stamp
 * @returns {object} server-versions.json contents
 */
export function buildServerVersionData(versions, fsdkVersion, generatedAt) {
  return {
    generatedAt,
    fsdkVersion,
    packages: versions,
  }
}

function isMainModule() {
  return process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
}

async function main() {
  const sbom = pullImageSbom(SERVER_IMAGE)
  const versions = versionsFromSbom(sbom)

  if (Object.keys(versions).length === 0) {
    throw new Error(`no package versions resolved from ${SERVER_IMAGE}`)
  }

  const fsdkVersion = spdxPackageVersion(sbom, 'freedesktop-sdk')
    ?? sbom.creationInfo?.comment?.match(/freedesktop-sdk-([\d.]+)/)?.[1]
    ?? 'unknown'

  const data = buildServerVersionData(versions, fsdkVersion, new Date().toISOString())

  fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`)
  console.info('[server-versions] wrote', OUT)
}

if (isMainModule()) {
  main().catch((e) => {
    console.error('[server-versions] fatal:', e.message)
    console.error(
      '[server-versions] Bluefin Server publishes no container image, so it has no '
      + 'SBOM. Add SBOM publishing to projectbluefin/server; do not substitute another source.',
    )
    process.exit(1)
  })
}
