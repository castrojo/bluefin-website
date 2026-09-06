import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  BLUEFIN_MONTHLY_WALLPAPERS,
  generateSocialCard,
  getAllowedWallpapers,
  selectRandomWallpaper,
} from '../generate-social-cards.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../..')
const PUBLIC_DIR = path.join(ROOT_DIR, 'public')
const WALLPAPERS_DIR = path.join(PUBLIC_DIR, 'img/wallpapers')
const TEMPLATE_PATH = path.join(ROOT_DIR, 'scripts/social-cards/template.html')

describe('social cards wallpaper pool', () => {
  it('contains exactly 22 first-party Bluefin monthly rotation files (11 pairs)', () => {
    const pool = getAllowedWallpapers()
    expect(pool).toHaveLength(22)

    // Pair 11 is intentionally excluded because it duplicates pair 12
    expect(pool.some(w => w.file.includes('bluefin-11'))).toBe(false)
  })

  it('contains no Aurora artwork or Aurora-origin xe_* assets', () => {
    const auroraPattern = /aurora|xe_/i
    for (const item of BLUEFIN_MONTHLY_WALLPAPERS) {
      expect(item.file).not.toMatch(auroraPattern)
      expect(item.title).not.toMatch(auroraPattern)
    }
  })

  it('references files that exist and are non-empty in public/img/wallpapers/', () => {
    for (const item of getAllowedWallpapers()) {
      const filePath = path.join(WALLPAPERS_DIR, item.file)
      expect(fs.existsSync(filePath), `file ${item.file} should exist`).toBe(true)
      const stats = fs.statSync(filePath)
      expect(stats.size, `file ${item.file} should be non-empty`).toBeGreaterThan(1000)
    }
  })

  it('selects a valid item with selectRandomWallpaper', () => {
    const pool = getAllowedWallpapers()
    const first = selectRandomWallpaper(pool, () => 0)
    expect(first).toEqual(pool[0])

    const last = selectRandomWallpaper(pool, () => 0.999)
    expect(last).toEqual(pool[pool.length - 1])

    const mid = selectRandomWallpaper(pool, () => 0.5)
    expect(pool).toContain(mid)
  })

  it('verifies the template exists and contains required structural markers', () => {
    expect(fs.existsSync(TEMPLATE_PATH)).toBe(true)
    const content = fs.readFileSync(TEMPLATE_PATH, 'utf8')
    expect(content).toContain('class="background"')
    expect(content).toContain('class="scrim"')
    expect(content).toContain('id="wordmark"')
    expect(content).toContain('id="headline"')
    expect(content).toContain('projectbluefin.io')
  })

  it('renders a valid social card with generateSocialCard', async () => {
    const testOutputPath = '/var/tmp/website-agent/test-social-card.webp'
    const sample = BLUEFIN_MONTHLY_WALLPAPERS[0]

    await generateSocialCard({
      wallpaper: sample,
      outputPath: testOutputPath,
      deviceScaleFactor: 1,
    })

    expect(fs.existsSync(testOutputPath)).toBe(true)
    const stats = fs.statSync(testOutputPath)
    expect(stats.size).toBeGreaterThan(5000)

    try {
      fs.unlinkSync(testOutputPath)
    }
    catch {}
  }, 20000)
})
