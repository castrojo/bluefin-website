import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  createDirectoryEntryPaths,
  createRollupInput,
  siteEntries,
} from '../lib/site-entries.js'

describe('siteEntries', () => {
  it('declares HTML files that exist on disk', () => {
    const rootDir = resolve(import.meta.dirname, '../..')
    for (const entry of siteEntries) {
      const fullPath = resolve(rootDir, entry.html)
      expect(existsSync(fullPath), `Entry ${entry.name} (${entry.html}) must exist`).toBe(true)
    }
  })

  it('builds rollup input mapping all entries to absolute paths', () => {
    const rootDir = '/fake/root'
    const input = createRollupInput(rootDir)

    expect(Object.keys(input)).toEqual([
      'main',
      'testing',
      'dakota',
      'server',
      'wolves',
      'wolves/experience',
    ])
    expect(input['main']).toBe('/fake/root/index.html')
    expect(input['wolves/experience']).toBe('/fake/root/wolves/experience/index.html')
  })

  it('derives directoryEntryPaths including nested directories like /wolves/experience', () => {
    const dirPaths = createDirectoryEntryPaths()

    expect(dirPaths).toBeInstanceOf(Set)
    expect(dirPaths).toEqual(new Set([
      '/dakota',
      '/server',
      '/wolves',
      '/wolves/experience',
    ]))
    // Root index.html must not be in directoryEntryPaths
    expect(dirPaths.has('')).toBe(false)
    expect(dirPaths.has('/')).toBe(false)
    // Non-directory entry like testing.html must not be in directoryEntryPaths
    expect(dirPaths.has('/public/testing')).toBe(false)
  })
})
