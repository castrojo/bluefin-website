import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT_DIR, 'public')
const WALLPAPERS_DIR = path.join(PUBLIC_DIR, 'img/wallpapers')
const TEMPLATE_PATH = path.join(__dirname, 'social-cards/template.html')
const WORDMARK_PATH = path.join(PUBLIC_DIR, 'brands/bluefin-wordmark.svg')

/**
 * Curated allowlist of first-party Bluefin monthly rotation wallpapers.
 * Strict invariant: Aurora artwork and Aurora-origin xe_* assets are
 * permanently excluded per project policy.
 */
export const BLUEFIN_MONTHLY_WALLPAPERS = [
  { file: 'bluefin-01-day.webp', title: 'Bluefin 01 - January (Day)', month: 'January', time: 'Day' },
  { file: 'bluefin-01-night.webp', title: 'Bluefin 01 - January (Night)', month: 'January', time: 'Night' },
  { file: 'bluefin-02-day.webp', title: 'Bluefin 02 - February (Day)', month: 'February', time: 'Day' },
  { file: 'bluefin-02-night.webp', title: 'Bluefin 02 - February (Night)', month: 'February', time: 'Night' },
  { file: 'bluefin-03-day.webp', title: 'Bluefin 03 - March (Day)', month: 'March', time: 'Day' },
  { file: 'bluefin-03-night.webp', title: 'Bluefin 03 - March (Night)', month: 'March', time: 'Night' },
  { file: 'bluefin-04-day.webp', title: 'Bluefin 04 - April (Day)', month: 'April', time: 'Day' },
  { file: 'bluefin-04-night.webp', title: 'Bluefin 04 - April (Night)', month: 'April', time: 'Night' },
  { file: 'bluefin-05-day.webp', title: 'Bluefin 05 - May (Day)', month: 'May', time: 'Day' },
  { file: 'bluefin-05-night.webp', title: 'Bluefin 05 - May (Night)', month: 'May', time: 'Night' },
  { file: 'bluefin-06-day.webp', title: 'Bluefin 06 - June (Day)', month: 'June', time: 'Day' },
  { file: 'bluefin-06-night.webp', title: 'Bluefin 06 - June (Night)', month: 'June', time: 'Night' },
  { file: 'bluefin-07-day.webp', title: 'Bluefin 07 - July (Day)', month: 'July', time: 'Day' },
  { file: 'bluefin-07-night.webp', title: 'Bluefin 07 - July (Night)', month: 'July', time: 'Night' },
  { file: 'bluefin-08-day.webp', title: 'Bluefin 08 - August (Day)', month: 'August', time: 'Day' },
  { file: 'bluefin-08-night.webp', title: 'Bluefin 08 - August (Night)', month: 'August', time: 'Night' },
  { file: 'bluefin-09-day.webp', title: 'Bluefin 09 - September (Day)', month: 'September', time: 'Day' },
  { file: 'bluefin-09-night.webp', title: 'Bluefin 09 - September (Night)', month: 'September', time: 'Night' },
  { file: 'bluefin-10-day.webp', title: 'Bluefin 10 - October (Day)', month: 'October', time: 'Day' },
  { file: 'bluefin-10-night.webp', title: 'Bluefin 10 - October (Night)', month: 'October', time: 'Night' },
  { file: 'bluefin-12-day.webp', title: 'Bluefin 12 - December (Day)', month: 'December', time: 'Day' },
  { file: 'bluefin-12-night.webp', title: 'Bluefin 12 - December (Night)', month: 'December', time: 'Night' },
]

/**
 * Returns the verified wallpaper pool, ensuring no Aurora or unapproved assets exist.
 */
export function getAllowedWallpapers() {
  const auroraPattern = /aurora|xe_/i
  return BLUEFIN_MONTHLY_WALLPAPERS.filter(item => !auroraPattern.test(item.file))
}

/**
 * Selects a random wallpaper from the allowed pool.
 */
export function selectRandomWallpaper(pool = getAllowedWallpapers(), randomFn = Math.random) {
  if (!pool.length) {
    throw new Error('Wallpaper pool is empty')
  }
  const index = Math.floor(randomFn() * pool.length)
  return pool[index]
}

/**
 * Converts a PNG image to WebP using cwebp or Python PIL fallback.
 */
export function convertPngToWebp(pngPath, webpPath, quality = 90) {
  try {
    execFileSync('cwebp', ['-q', String(quality), pngPath, '-o', webpPath], { stdio: 'pipe' })
    return true
  }
  catch {
    try {
      execFileSync('python3', [
        '-c',
        `from PIL import Image; Image.open('${pngPath}').save('${webpPath}', 'WEBP', quality=${quality})`,
      ], { stdio: 'pipe' })
      return true
    }
    catch (err) {
      console.warn('WebP conversion failed, keeping PNG:', err.message)
      fs.copyFileSync(pngPath, webpPath)
      return false
    }
  }
}

/**
 * Generates an Open Graph social card image for a specific wallpaper.
 */
export async function generateSocialCard({
  wallpaper,
  outputPath = path.join(PUBLIC_DIR, 'meta.webp'),
  deviceScaleFactor = 2,
  browser = null,
}) {
  const shouldCloseBrowser = !browser
  const activeBrowser = browser ?? await chromium.launch({ headless: true })

  try {
    const wallpaperPath = path.join(WALLPAPERS_DIR, wallpaper.file)
    if (!fs.existsSync(wallpaperPath)) {
      throw new Error(`Wallpaper file not found: ${wallpaperPath}`)
    }

    const wallpaperBase64 = fs.readFileSync(wallpaperPath).toString('base64')
    const wallpaperDataUrl = `data:image/webp;base64,${wallpaperBase64}`
    const wordmarkSvg = fs.readFileSync(WORDMARK_PATH, 'utf8')

    let templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf8')
    // Inject SVGs and assets directly into the template
    templateHtml = templateHtml
      .replace('<div class="background" id="bg"></div>', `<div class="background" id="bg" style="background-image: url('${wallpaperDataUrl}')"></div>`)
      .replace('<div class="wordmark-wrap" id="wordmark"></div>', `<div class="wordmark-wrap" id="wordmark">${wordmarkSvg}</div>`)
      .replace('<div class="wallpaper-credit" id="credit"></div>', `<div class="wallpaper-credit" id="credit">${wallpaper.title}</div>`)

    const page = await activeBrowser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor,
    })

    await page.setContent(templateHtml, { waitUntil: 'networkidle' })

    const tempPngPath = path.join(ROOT_DIR, '.tmp-social-card.png')
    await page.screenshot({ path: tempPngPath, type: 'png' })
    await page.close()

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })

    // Convert to WebP
    convertPngToWebp(tempPngPath, outputPath, 90)

    try {
      fs.unlinkSync(tempPngPath)
    }
    catch {}

    return outputPath
  }
  finally {
    if (shouldCloseBrowser) {
      await activeBrowser.close()
    }
  }
}

// CLI execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2)

  if (args.includes('--list')) {
    console.info('Allowed Bluefin Wallpaper Pool (22 items):')
    for (const item of getAllowedWallpapers()) {
      console.info(` - ${item.file}: ${item.title}`)
    }
    process.exit(0)
  }

  const wallpaperArgIdx = args.indexOf('--wallpaper')
  let selectedWallpaper = null

  if (wallpaperArgIdx !== -1 && args[wallpaperArgIdx + 1]) {
    const targetFile = args[wallpaperArgIdx + 1]
    selectedWallpaper = getAllowedWallpapers().find(w => w.file === targetFile)
    if (!selectedWallpaper) {
      console.error(`Error: Wallpaper "${targetFile}" not in allowed pool`)
      process.exit(1)
    }
  }
  else {
    selectedWallpaper = selectRandomWallpaper()
  }

  if (args.includes('--all')) {
    const outDir = path.join(PUBLIC_DIR, 'cards')
    fs.mkdirSync(outDir, { recursive: true })
    console.info(`Generating cards for all ${getAllowedWallpapers().length} wallpapers into public/cards/...`)

    const browser = await chromium.launch({ headless: true })
    try {
      for (const item of getAllowedWallpapers()) {
        const outPath = path.join(outDir, item.file)
        await generateSocialCard({ wallpaper: item, outputPath: outPath, browser })
        console.info(`  ✓ ${item.file}`)
      }
      // Also write one random to public/meta.webp
      const randomItem = selectRandomWallpaper()
      await generateSocialCard({ wallpaper: randomItem, outputPath: path.join(PUBLIC_DIR, 'meta.webp'), browser })
      console.info(`Selected ${randomItem.file} for public/meta.webp`)
    }
    finally {
      await browser.close()
    }
  }
  else {
    const outPath = path.join(PUBLIC_DIR, 'meta.webp')
    console.info(`Generating social preview card with ${selectedWallpaper.title} -> ${outPath}...`)
    await generateSocialCard({ wallpaper: selectedWallpaper, outputPath: outPath })
    console.info(`Successfully generated ${outPath} (${selectedWallpaper.title})`)
  }
}
