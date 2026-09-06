import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  BLUEFIN_EXTRA_WALLPAPERS,
  BLUEFIN_MONTHLY_WALLPAPERS,
  generateSocialCard,
  getAllowedWallpapers,
  selectMonthlyWallpaper,
  selectRandomWallpaper,
  selectRotatingWallpaper,
} from '../generate-social-cards.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../..')
const PUBLIC_DIR = path.join(ROOT_DIR, 'public')
const WALLPAPERS_DIR = path.join(PUBLIC_DIR, 'img/wallpapers')
const TEMPLATE_PATH = path.join(ROOT_DIR, 'scripts/social-cards/template.html')

describe('social cards wallpaper pool', () => {
  it('contains exactly 24 monthly rotation files (all 12 months, day & night pairs)', () => {
    expect(BLUEFIN_MONTHLY_WALLPAPERS).toHaveLength(24)
    for (let m = 1; m <= 12; m++) {
      const monthItems = BLUEFIN_MONTHLY_WALLPAPERS.filter(w => w.monthIndex === m)
      expect(monthItems).toHaveLength(2)
      expect(monthItems.some(w => w.time === 'Day')).toBe(true)
      expect(monthItems.some(w => w.time === 'Night')).toBe(true)
    }
  })

  it('contains 12 extra wallpapers (wolves story illustrations, no xe assets)', () => {
    expect(BLUEFIN_EXTRA_WALLPAPERS).toHaveLength(12)
    const xeCount = BLUEFIN_EXTRA_WALLPAPERS.filter(w => w.file.includes('xe_')).length
    expect(xeCount).toBe(0)
    const wolvesCount = BLUEFIN_EXTRA_WALLPAPERS.filter(w => w.file.startsWith('wolves/')).length
    expect(wolvesCount).toBe(12)
  })

  it('contains exactly 36 wallpapers total in the allowed pool', () => {
    const pool = getAllowedWallpapers()
    expect(pool).toHaveLength(36)
  })

  it('contains no Aurora artwork or Xe assets in any entry', () => {
    const excludedPattern = /aurora|xe_/i
    for (const item of getAllowedWallpapers()) {
      expect(item.file).not.toMatch(excludedPattern)
      expect(item.title).not.toMatch(excludedPattern)
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

  it('rotates deterministically by day of year with selectRotatingWallpaper', () => {
    const pool = getAllowedWallpapers()
    const jan1 = new Date(Date.UTC(2026, 0, 1))
    const jan2 = new Date(Date.UTC(2026, 0, 2))
    const item1 = selectRotatingWallpaper(pool, jan1)
    const item2 = selectRotatingWallpaper(pool, jan2)

    expect(item1).toBeDefined()
    expect(item2).toBeDefined()
    expect(item1).not.toEqual(item2)
  })

  it('selects matching month and day/night with selectMonthlyWallpaper', () => {
    const pool = getAllowedWallpapers()
    const septDay = new Date(Date.UTC(2026, 8, 15, 12, 0, 0)) // September day
    const septNight = new Date(Date.UTC(2026, 8, 15, 23, 0, 0)) // September night

    const dayChoice = selectMonthlyWallpaper(pool, septDay)
    const nightChoice = selectMonthlyWallpaper(pool, septNight)

    expect(dayChoice.file).toBe('bluefin-09-day.webp')
    expect(nightChoice.file).toBe('bluefin-09-night.webp')
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
    expect(content).toContain('id="wordmark"')
    expect(content).toContain('class="wordmark-wrap"')
  })

  it('renders a valid social card with generateSocialCard', async () => {
    const testOutputPath = '/var/tmp/website-agent/test-social-card.webp'
    const sample = BLUEFIN_EXTRA_WALLPAPERS[0]

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
