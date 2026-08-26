#!/usr/bin/env node

/**
 * Updates dakota-versions.json from the BST SPDX SBOM attached to the
 * :stable image on GHCR. Falls back to :latest if :stable has no SBOM.
 *
 * Requires: oras (installed by update-content.yml), gh CLI (pre-installed
 * in GitHub Actions runners) for auth token.
 *
 * Sources:
 * 1. GHCR OCI SBOM referrer on ghcr.io/projectbluefin/dakota — BST SPDX
 * 2. projectbluefin/dakota elements/freedesktop-sdk.bst — sdk version
 * 3. Existing dakota-versions.json — fallback for fields not in SBOM
 */

import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/dakota-versions.json')
const FDSDK_BST_URL = 'https://api.github.com/repos/projectbluefin/dakota/contents/elements/freedesktop-sdk.bst'

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

export function decodeGitHubContent(content, encoding) {
  return encoding === 'base64' ? Buffer.from(content, 'base64').toString() : content
}

export function extractFreedesktopSdkVersion(text) {
  return text.match(/ref:\s*freedesktop-sdk-([\d.]+)/)?.[1] ?? null
}

/**
 * Merge package versions from BST streams data into the current dakota-versions object.
 * @param {object} current  - existing dakota-versions.json contents
 * @param {object} streamsData - { streams: { 'dakota-latest': { releases: { latest: { packageVersions } } } } }
 * @param {string} date     - ISO date string to stamp generatedAt
 */
export function applySbomVersions(current, streamsData, date) {
  const streams = streamsData.streams || {}
  const dakotaLatest = streams['dakota-latest']?.releases?.latest?.packageVersions
  if (!dakotaLatest) {
    return current
  }
  const packages = { ...current.packages }
  for (const field of ['kernel', 'gnome', 'mesa', 'systemd', 'podman', 'pipewire', 'flatpak']) {
    if (dakotaLatest[field]) {
      packages[field] = dakotaLatest[field]
    }
  }
  if (dakotaLatest.allPackages) {
    for (const [k, v] of Object.entries(dakotaLatest.allPackages)) {
      packages[k] = v
    }
  }
  const nvidiaVersions = streams['dakota-nvidia-latest']?.releases?.latest?.packageVersions
  if (nvidiaVersions?.nvidia) {
    packages.nvidia = nvidiaVersions.nvidia
  }
  return { ...current, packages, generatedAt: date }
}

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

export function extractSourceVersion(text, pattern) {
  return text.match(pattern)?.[1] ?? null
}

// ---------------------------------------------------------------------------
// Source files
// ---------------------------------------------------------------------------

const SOURCE_FILES = {
  gnome: 'elements/gnome-build-meta.bst',
  bootc: 'elements/gnomeos-deps/bootc.bst',
  nvidia: 'elements/bluefin-nvidia/nvidia-drivers.bst',
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const current = JSON.parse(fs.readFileSync(OUT, 'utf8'))

  // 1. SBOM from GHCR — :stable then :latest
  try {
    // Source refs from upstream Dakota main. Keep existing values for packages
    // that are only discoverable from a published image SBOM.
    const headers = {
      'User-Agent': 'bluefin-website-updater',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
    }
    const sourceVersions = {
      gnome: { url: `https://api.github.com/repos/projectbluefin/dakota/contents/${SOURCE_FILES.gnome}`, pattern: /ref:\s*(\d+\.\d+)/ },
      bootc: { url: `https://api.github.com/repos/projectbluefin/dakota/contents/${SOURCE_FILES.bootc}`, pattern: /ref:\s*v(\d+\.\d+\.\d+)-/ },
      nvidia: { url: `https://api.github.com/repos/projectbluefin/dakota/contents/${SOURCE_FILES.nvidia}`, pattern: /nvidia-version:\s*['"]?(\d+\.\d+\.\d+)/ },
    }
    for (const [field, source] of Object.entries(sourceVersions)) {
      const res = await fetch(source.url, { headers })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${source.url}`)
      }
      const { content, encoding } = await res.json()
      const version = extractSourceVersion(decodeGitHubContent(content, encoding), source.pattern)
      if (version) {
        current.packages[field] = version
        console.info(`[dakota-versions] ${field} → ${version}`)
      }
    }
  }
  catch (e) {
    console.warn('[dakota-versions] source ref fetch failed:', e.message)
  }

  // 2. freedesktop-sdk from upstream dakota main
  try {
    const headers = {
      'User-Agent': 'bluefin-website-updater',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
    }
    const res = await fetch(FDSDK_BST_URL, { headers })
    if (res.ok) {
      const { content, encoding } = await res.json()
      const raw = decodeGitHubContent(content, encoding)
      const ver = extractFreedesktopSdkVersion(raw)
      if (ver) {
        current.packages['freedesktop-sdk'] = ver
        console.info(`[dakota-versions] freedesktop-sdk → ${ver}`)
      }
    }
  }
  catch (e) {
    console.warn('[dakota-versions] freedesktop-sdk fetch failed:', e.message)
  }

  fs.writeFileSync(OUT, `${JSON.stringify(current, null, 2)}\n`)
  console.info('[dakota-versions] wrote', OUT)
}

main().catch((e) => {
  console.error('[dakota-versions] error:', e.message)
  process.exit(0)
})
