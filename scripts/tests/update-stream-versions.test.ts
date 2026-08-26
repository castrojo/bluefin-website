import { afterEach, describe, expect, it, vi } from 'vitest'

const { updateImageVersions } = vi.hoisted(() => ({
  updateImageVersions: vi.fn(),
}))

vi.mock('../update-image-versions.js', () => ({
  updateImageVersions,
}))

describe('update-stream-versions wrapper', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('exports updateProducts as the entry point', async () => {
    const mod = await import('../update-stream-versions.js')
    expect(typeof mod.updateProducts).toBe('function')
  })

  it('delegates to the unified atomic updater', async () => {
    updateImageVersions.mockResolvedValue(undefined)
    const { updateProducts } = await import('../update-stream-versions.js')
    await updateProducts()

    expect(updateImageVersions).toHaveBeenCalledOnce()
  })
})
