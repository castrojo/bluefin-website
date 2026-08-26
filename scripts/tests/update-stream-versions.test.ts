import { describe, expect, it } from 'vitest'
import { createHeader } from '../update-stream-versions.js'

describe('update-stream-versions', () => {
  it('creates the generated header with a stable date', () => {
    expect(createHeader('2025-02-14')).toContain('# Last updated: 2025-02-14')
  })

  it('header references verified OCI image SBOMs', () => {
    const header = createHeader()
    expect(header).toContain('verified OCI image SBOMs')
    expect(header).not.toContain('docs.projectbluefin.io')
  })
})
