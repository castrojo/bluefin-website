#!/usr/bin/env node

/**
 * Download the Bluefin growth chart SVG from ublue-os/countme and recolor it
 * for the site theme.
 *
 * Security: the download is pinned to an immutable commit SHA and verified
 * against a known SHA-256, and the SVG is rejected if it contains scriptable
 * content. The mutable main branch must not flow unreviewed into the
 * deployed bundle. To move to a newer upstream chart, bump both constants
 * below together (SHA + checksum), like any other pinned dependency.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../src/assets/svg/growth_bluefins.svg')

const COUNTME_COMMIT = 'e961215f048b9b86c550eb59afc2fa122b409325'
const GROWTH_CHART_SHA256 = 'c0b371bfecd01bf64b2295487bbc40d51da6deac6dc50dd4e9b7ccad782f5add'
const CHART_URL = `https://raw.githubusercontent.com/ublue-os/countme/${COUNTME_COMMIT}/growth_bluefins.svg`

const RECOLOR = [
  [/#ffffff/g, '#0c1016'],
  [/#cccccc/g, '#272727'],
  [/#616161/g, '#bdbdbd'],
  [/#77aadd/g, '#4285f4'],
  [/id="text_16">/g, 'id="text_16" style="fill: #bdbdbd">'],
]

const SCRIPTABLE = /<script|on(?:load|error|click|mouseover)=/i

export function recolor(svg) {
  let out = svg
  for (const [from, to] of RECOLOR) {
    out = out.replace(from, to)
  }
  return out
}

export function assertSafeSvg(svg) {
  if (!/^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(svg)) {
    throw new Error('download is not an SVG document')
  }
  if (SCRIPTABLE.test(svg)) {
    throw new Error('growth chart SVG contains scriptable content; refusing to deploy')
  }
}

async function main() {
  const res = await fetch(CHART_URL)
  if (!res.ok) {
    throw new Error(`growth chart fetch failed: ${res.status} ${res.statusText}`)
  }
  const svg = await res.text()

  const actual = crypto.createHash('sha256').update(svg).digest('hex')
  if (actual !== GROWTH_CHART_SHA256) {
    throw new Error(
      `growth chart checksum mismatch: expected ${GROWTH_CHART_SHA256}, got ${actual}. `
      + 'If upstream published a new chart, pin the new commit SHA and checksum together.',
    )
  }

  assertSafeSvg(svg)
  fs.writeFileSync(OUT, recolor(svg))
  console.info('[growth-chart] wrote', OUT)
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main().catch((e) => {
    console.error('[growth-chart] fatal:', e.message)
    process.exit(1)
  })
}
