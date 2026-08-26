#!/usr/bin/env node

/**
 * Script to update server-versions.json with live data from:
 *   1. Flatcar Container Linux release server — version.txt + SPDX SBOM JSON
 *      for each stream (stable, beta, alpha, lts)
 *   2. GitHub Releases API — projectbluefin/server latest tag
 *
 * Flatcar SBOM URL pattern:
 *   https://{channel}.release.flatcar-linux.net/amd64-usr/current/flatcar_production_image_sbom.json
 *
 * Non-zero exit is intentional when all fetches fail — CI should fail loudly
 * if both the data source AND the fallback values are missing.
 * Individual stream failures are soft (keep existing value).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/server-versions.json')

const CHANNELS = ['stable', 'beta', 'alpha', 'lts']
const SERVER_RELEASES_URL = 'https://api.github.com/repos/projectbluefin/server/releases/latest'

const headers = {
  'User-Agent': 'bluefin-website-updater',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
}

export async function fetchText(url) {
  const res = await fetch(url, { headers, redirect: 'follow' })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`)
  }
  return res.text()
}

export async function fetchJSON(url) {
  const res = await fetch(url, { headers, redirect: 'follow' })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`)
  }
  return res.json()
}

export function parseVersionTxt(body) {
  const result = {}
  for (const line of body.split('\n')) {
    const parts = line.trim().split('=')
    if (parts.length !== 2) {
      continue
    }
    const [key, val] = parts.map(s => s.replace(/^"|"$/g, ''))
    if (key === 'FLATCAR_VERSION') {
      result.version = val
    }
    if (key === 'FLATCAR_BUILD_ID' && val.length >= 10) {
      result.buildDate = val.slice(0, 10)
    }
  }
  return result
}

export function parseSBOM(doc) {
  const result = {}
  for (const pkg of (doc.packages ?? [])) {
    switch (pkg.name) {
      case 'sys-kernel/coreos-kernel':
        result.kernel = pkg.versionInfo
        break
      case 'sys-apps/systemd':
        result.systemd = pkg.versionInfo
        break
      case 'sys-apps/ignition':
        result.ignition = (pkg.versionInfo ?? '').replace(/-r\d+$/, '')
        break
      case 'dev-db/etcd':
        result.etcd = pkg.versionInfo
        break
    }
  }
  return result
}

export function extractVersion(line, prefix) {
  const after = line.slice(prefix.length)
  const colonIdx = after.indexOf('::')
  return colonIdx >= 0 ? after.slice(0, colonIdx) : after
}

// Flatcar ships these NVIDIA driver sysexts for the stable channel.
// The label follows NVIDIA's official branch classification.
const NVIDIA_BRANCHES = [
  { id: '570-open', label: 'Production' },
  { id: '550-open', label: 'Production' },
  { id: '535-open', label: 'Long-Term Support' },
]

export function extractNvidiaVersion(contents) {
  const match = contents.match(/libcuda\.so\.(\d+\.\d+\.\d+)/)
  return match ? match[1] : null
}

async function fetchNvidiaDrivers() {
  const base = 'https://stable.release.flatcar-linux.net/amd64-usr/current'
  const drivers = []
  for (const branch of NVIDIA_BRANCHES) {
    try {
      const txt = await fetchText(`${base}/flatcar-nvidia-drivers-${branch.id}_contents.txt`)
      const version = extractNvidiaVersion(txt)
      if (version) {
        drivers.push({ label: branch.label, version })
        console.info(`[nvidia] ${branch.id} → ${version}`)
      }
    }
    catch (e) {
      console.warn(`[nvidia] ${branch.id} failed:`, e.message)
    }
  }
  return drivers.length > 0 ? drivers : null
}

export function parseSysext(body) {
  const result = {}
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (
      line.startsWith('app-containers/docker-')
      && !line.includes('docker-cli')
      && !line.includes('docker-buildx')
    ) {
      result.docker = extractVersion(line, 'app-containers/docker-')
    }
    if (line.startsWith('app-containers/containerd-')) {
      result.containerd = extractVersion(line, 'app-containers/containerd-')
    }
  }
  return result
}

async function fetchChannel(channel, existing) {
  const base = `https://${channel}.release.flatcar-linux.net/amd64-usr/current`
  const stream = { ...existing }

  try {
    const txt = await fetchText(`${base}/version.txt`)
    const parsed = parseVersionTxt(txt)
    if (parsed.version) {
      stream.version = parsed.version
    }
    if (parsed.buildDate) {
      stream.buildDate = parsed.buildDate
    }
    console.info(`[${channel}] version → ${stream.version} (${stream.buildDate})`)
  }
  catch (e) {
    console.warn(`[${channel}] version.txt failed:`, e.message)
  }

  try {
    const doc = await fetchJSON(`${base}/flatcar_production_image_sbom.json`)
    const parsed = parseSBOM(doc)
    if (parsed.kernel) {
      stream.kernel = parsed.kernel
    }
    if (parsed.systemd) {
      stream.systemd = parsed.systemd
    }
    if (parsed.ignition) {
      stream.ignition = parsed.ignition
    }
    if (parsed.etcd) {
      stream.etcd = parsed.etcd
    }
    console.info(`[${channel}] SBOM → kernel ${stream.kernel}, systemd ${stream.systemd}`)
  }
  catch (e) {
    console.warn(`[${channel}] SBOM failed:`, e.message)
  }

  try {
    const txt = await fetchText(`${base}/rootfs-included-sysexts/docker-flatcar_packages.txt`)
    const parsed = parseSysext(txt)
    if (parsed.docker) {
      stream.docker = parsed.docker
    }
  }
  catch (e) {
    console.warn(`[${channel}] docker sysext failed:`, e.message)
  }

  try {
    const txt = await fetchText(`${base}/rootfs-included-sysexts/containerd-flatcar_packages.txt`)
    const parsed = parseSysext(txt)
    if (parsed.containerd) {
      stream.containerd = parsed.containerd
    }
  }
  catch (e) {
    console.warn(`[${channel}] containerd sysext failed:`, e.message)
  }

  return stream
}

function isMainModule() {
  return process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
}

async function main() {
  const current = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  const existingStreams = current.streams ?? {}

  // Fetch all channels + NVIDIA drivers in parallel
  const [results, nvidiaDrivers] = await Promise.all([
    Promise.all(CHANNELS.map(ch => fetchChannel(ch, existingStreams[ch] ?? {}))),
    fetchNvidiaDrivers(),
  ])

  current.streams = Object.fromEntries(CHANNELS.map((ch, i) => [ch, results[i]]))
  if (nvidiaDrivers) {
    current.nvidiaDrivers = nvidiaDrivers
  }

  // Latest Server release tag
  try {
    const release = await fetchJSON(SERVER_RELEASES_URL)
    if (release.tag_name) {
      current.serverVersion = release.tag_name
      console.info(`[server] release → ${release.tag_name}`)
    }
  }
  catch (e) {
    console.warn('[server] release fetch failed:', e.message)
  }

  current.generatedAt = new Date().toISOString()
  // Remove old flat flatcar key if present (schema migration)
  delete current.flatcar

  fs.writeFileSync(OUT, `${JSON.stringify(current, null, 2)}\n`)
  console.info('[server-versions] wrote', OUT)
}

if (isMainModule()) {
  main().catch((e) => {
    console.error('[server-versions] fatal:', e.message)
    process.exit(1)
  })
}
