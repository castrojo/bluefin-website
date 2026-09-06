import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const rootDirectory = process.cwd()
const generatorPath = resolve(rootDirectory, 'scripts/generate-wallpapers.js')
const wallpaperListPath = resolve(rootDirectory, 'src/components/wolves/wallpapers-list.ts')

describe('wallpaper generator', () => {
  it('generates a lint-clean TypeScript list', async () => {
    execFileSync(process.execPath, [generatorPath], { cwd: rootDirectory })

    const [result] = await new ESLint({ cwd: rootDirectory }).lintFiles(wallpaperListPath)

    expect(result.errorCount).toBe(0)
    expect(result.warningCount).toBe(0)
  }, 30000)
})
