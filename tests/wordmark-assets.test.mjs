import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Wordmark Assets', () => {
  const files = [
    'public/brands/bluefin-wordmark.svg',
    'public/brands/bluefin-wordmark-dark.svg',
    'public/brands/bluefin-wordmark-light.svg'
  ]

  for (const file of files) {
    it(`verifies ${file} exists and has transparent background`, () => {
      expect(existsSync(file)).toBe(true)
      const content = readFileSync(file, 'utf-8')
      expect(content).toContain('viewBox="0 0 105.658 43.183"')
      expect(content).not.toMatch(/<rect\s+[^>]*width="105\.658"/)
      expect(content).toContain('#4285f4')
    })
  }
})
