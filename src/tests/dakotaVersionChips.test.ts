import type { DakotaVersions } from '../composables'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock getDakotaVersions to bypass the module-level singleton cache: once any
// test triggers the real composable, every later test in this file would get
// the cached value regardless of how fetch is stubbed.
const getDakotaVersionsMock = vi.fn<() => Promise<DakotaVersions>>()
vi.mock('../composables', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../composables')>()
  return { ...orig, getDakotaVersions: () => getDakotaVersionsMock() }
})

// Import after mock is set up
const { default: DakotaVersionChips } = await import('../components/dakota/DakotaVersionChips.vue')

const VERSIONS_JSON: DakotaVersions = {
  checkedAt: '2026-08-01T00:00:00Z',
  status: 'verified',
  sources: [],
  packages: {
    kernel: '6.19.11',
    gnome: '50.0',
    mesa: '',
    baseline: 'x86-64-v3',
  },
}

function mountChips(props: { keys?: string[] } = {}) {
  return mount(DakotaVersionChips, { props })
}

describe('dakotaVersionChips.vue', () => {
  afterEach(() => {
    getDakotaVersionsMock.mockReset()
  })

  it('renders chips for every non-empty package with mapped labels', async () => {
    getDakotaVersionsMock.mockResolvedValue(VERSIONS_JSON)

    const wrapper = mountChips()
    await flushPromises()

    const chips = wrapper.findAll('.version-chip')
    // mesa is an empty string in the payload and must be filtered out.
    expect(chips).toHaveLength(3)
    expect(chips.map(chip => chip.get('.chip-label').text())).toEqual([
      'Kernel',
      'GNOME',
      'x86-64',
    ])
    expect(chips.map(chip => chip.get('.chip-value').text())).toEqual([
      '6.19.11',
      '50.0',
      'x86-64-v3',
    ])
  })

  it('flags the baseline chip as a feature chip', async () => {
    getDakotaVersionsMock.mockResolvedValue(VERSIONS_JSON)

    const wrapper = mountChips()
    await flushPromises()

    const featureChips = wrapper.findAll('.version-chip.chip-feature')
    expect(featureChips).toHaveLength(1)
    expect(featureChips[0].get('.chip-label').text()).toBe('x86-64')
  })

  it('limits chips to the requested keys', async () => {
    getDakotaVersionsMock.mockResolvedValue(VERSIONS_JSON)

    const wrapper = mountChips({ keys: ['kernel'] })
    await flushPromises()

    const chips = wrapper.findAll('.version-chip')
    expect(chips).toHaveLength(1)
    expect(chips[0].get('.chip-label').text()).toBe('Kernel')
  })

  it('renders nothing when the versions fetch fails', async () => {
    getDakotaVersionsMock.mockRejectedValue(new Error('network error'))

    const wrapper = mountChips()
    await flushPromises()

    expect(getDakotaVersionsMock).toHaveBeenCalledOnce()
    expect(wrapper.find('.version-chips').exists()).toBe(false)
    expect(wrapper.findAll('.version-chip')).toHaveLength(0)
  })

  it('renders nothing when the payload has no packages', async () => {
    getDakotaVersionsMock.mockResolvedValue({
      checkedAt: '2026-08-01T00:00:00Z',
      status: 'verified',
      sources: [],
      packages: {},
    })

    const wrapper = mountChips()
    await flushPromises()

    expect(getDakotaVersionsMock).toHaveBeenCalledOnce()
    expect(wrapper.find('.version-chips').exists()).toBe(false)
    expect(wrapper.findAll('.version-chip')).toHaveLength(0)
  })

  it('renders nothing when keys is an empty array', async () => {
    getDakotaVersionsMock.mockResolvedValue(VERSIONS_JSON)

    const wrapper = mountChips({ keys: [] })
    await flushPromises()

    expect(getDakotaVersionsMock).toHaveBeenCalledOnce()
    expect(wrapper.find('.version-chips').exists()).toBe(false)
    expect(wrapper.findAll('.version-chip')).toHaveLength(0)
  })

  it('falls back to the raw package key when no label is mapped', async () => {
    getDakotaVersionsMock.mockResolvedValue({
      checkedAt: '2026-08-01T00:00:00Z',
      status: 'verified',
      sources: [],
      packages: {
        kernel: '6.19.11',
        brandNewPackage: '9.9.9',
      },
    })

    const wrapper = mountChips()
    await flushPromises()

    const chips = wrapper.findAll('.version-chip')
    expect(chips.map(chip => chip.get('.chip-label').text())).toEqual([
      'Kernel',
      'brandNewPackage',
    ])
    expect(chips[1].get('.chip-value').text()).toBe('9.9.9')
  })
})
