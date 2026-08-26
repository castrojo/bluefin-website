#!/usr/bin/env node

/**
 * Updates dakota-versions.json from the SPDX SBOMs attached to the published
 * Dakota images on GHCR.
 *
 * Sources — and the only permitted ones:
 * 1. ghcr.io/projectbluefin/dakota:latest        — OS package versions
 * 2. ghcr.io/projectbluefin/dakota-nvidia:latest — NVIDIA driver version
 *
 * Do not reintroduce parsing of projectbluefin/dakota `.bst` refs. Those
 * describe the next build, not the image users are running, and reporting them
 * shows versions that have never shipped.
 *
 * Requires: oras (installed by update-content.yml), authenticated against ghcr.io.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { pullImageSbom, spdxPackageVersion } from './lib/oci-sbom.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/dakota-versions.json')

const OS_IMAGE = 'ghcr.io/projectbluefin/dakota:latest'
const NVIDIA_IMAGE = 'ghcr.io/projectbluefin/dakota-nvidia:latest'

// dakota-versions.json field → SPDX package name in the BuildStream SBOM.
const OS_PACKAGES = {
  kernel: 'linux',
  gnome: 'gnome-shell',
  mesa: 'mesa',
  systemd: 'systemd',
  podman: 'podman',
  pipewire: 'pipewire',
  flatpak: 'flatpak',
  bootc: 'bootc',
}

const NVIDIA_PACKAGES = {
  nvidia: 'NVIDIA-Linux-x86',
}

/**
 * Read the mapped package versions out of one SPDX document.
 * @param {object} sbom - parsed SPDX document
 * @param {Record<string, string>} mapping - output field to SPDX package name
 * @param {string} label - log prefix identifying the image
 * @returns {Record<string, string>} resolved versions, omitting misses
 */
export function versionsFromSbom(sbom, mapping, label = 'sbom') {
  const resolved = {}
  for (const [field, packageName] of Object.entries(mapping)) {
    const version = spdxPackageVersion(sbom, packageName)
    if (version) {
      resolved[field] = version
      console.info(`[dakota-versions] ${label}: ${field} -> ${version}`)
    }
    else {
      console.warn(`[dakota-versions] ${label}: no version for "${packageName}"`)
    }
  }
  return resolved
}

/**
 * Merge SBOM-derived versions into the existing document.
 * @param {object} current - existing dakota-versions.json contents
 * @param {Record<string, string>} versions - SBOM-derived package versions
 * @param {string} generatedAt - ISO timestamp to stamp
 * @returns {object} updated document
 */
export function applyVersions(current, versions, generatedAt) {
  const metadata = Object.fromEntries(
    Object.entries(current.packages).filter(([field]) => field === 'baseline'),
  )
  return {
    ...current,
    packages: { ...versions, ...metadata },
    generatedAt,
  }
}

function isMainModule() {
  return process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
}

async function main() {
  const current = JSON.parse(fs.readFileSync(OUT, 'utf8'))

  const osVersions = versionsFromSbom(pullImageSbom(OS_IMAGE), OS_PACKAGES, 'dakota')

  if (Object.keys(osVersions).length === 0) {
    throw new Error(`no package versions resolved from ${OS_IMAGE}`)
  }

  let nvidiaVersions = {}
  try {
    nvidiaVersions = versionsFromSbom(pullImageSbom(NVIDIA_IMAGE), NVIDIA_PACKAGES, 'dakota-nvidia')
  }
  catch (error) {
    // The NVIDIA variant lags the base image; keep the last known value rather
    // than failing the whole update.
    console.warn('[dakota-versions] dakota-nvidia SBOM unavailable:', error.message)
  }

  const updated = applyVersions(
    current,
    { ...osVersions, ...nvidiaVersions },
    new Date().toISOString(),
  )

  fs.writeFileSync(OUT, `${JSON.stringify(updated, null, 2)}\n`)
  console.info('[dakota-versions] wrote', OUT)
}

if (isMainModule()) {
  main().catch((e) => {
    console.error('[dakota-versions] fatal:', e.message)
    process.exit(1)
  })
}
