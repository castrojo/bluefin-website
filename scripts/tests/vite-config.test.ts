import { describe, expect, it } from 'vitest'

import { createVitestExclude } from '../lib/vitest-exclude.js'

describe('createVitestExclude', () => {
  it('excludes nested worktrees from the root checkout', () => {
    expect(createVitestExclude('/var/home/jorge/src/website')).toContain('**/.worktrees/**')
  })

  it('keeps the current linked worktree testable', () => {
    expect(createVitestExclude('/var/home/jorge/src/website/.worktrees/fix-download-pages')).not.toContain('**/.worktrees/**')
  })
})
