import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import SectionPicker from '../components/sections/SectionPicker.vue'
import { i18n } from '../locales/schema'

function mountPicker() {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    if (input.endsWith('/dakota-versions.json')) {
      return {
        ok: true,
        json: async () => ({
          checkedAt: '2026-08-25T00:00:00.000Z',
          status: 'verified',
          sources: [],
          packages: {
            kernel: '7.0.7',
            gnome: '50.2',
            mesa: '26.0.6',
            systemd: '260.2',
            podman: '5.8.2',
            pipewire: '1.6.1',
            flatpak: '1.16.6',
            bootc: '1.15.2',
            nvidia: '595.71.05'
          }
        })
      }
    }

    throw new Error('offline')
  }))

  return mount(SectionPicker, {
    global: {
      plugins: [i18n],
      provide: {
        visibleSection: ref('')
      }
    }
  })
}

describe('sectionPicker.vue', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the Wolves contributor section with cards in order', async () => {
    const wrapper = mountPicker()
    await vi.waitFor(() => {
      expect(wrapper.findAll('.wolves-download-grid .card-box')).toHaveLength(3)
    })

    expect(wrapper.get('#wolves-downloads-title').text()).toBe('For the Wolves')
    expect(wrapper.get('.wolves-download-header p').text()).toContain(
      'No compromises.'
    )

    const cards = wrapper.findAll('.wolves-download-grid .card-box')
    expect(cards.map(card => card.get('.card-title').text())).toEqual([
      'Dakota',
      'Utah',
      'Bluefin Server'
    ])
    expect(cards.map(card => card.attributes('href'))).toEqual([
      '/dakota/',
      'https://devconf.us',
      '/server/'
    ])
    expect(cards.map(card => card.get('.card-image').attributes('style'))).toEqual([
      expect.stringContaining('characters/dakota.webp'),
      expect.stringContaining('characters/utah.webp'),
      expect.stringContaining('characters/alamosaurus.webp')
    ])
  })

  it('reuses the raptor card version rows and labels for Dakota', async () => {
    const wrapper = mountPicker()
    await vi.waitFor(() => {
      expect(wrapper.findAll('.wolves-download-grid .version-row').length).toBeGreaterThan(0)
    })

    const dakota = wrapper.findAll('.wolves-download-grid .card-box')[0]
    const rows = dakota.findAll('.version-row').map(row => [
      row.get('.version-label').text(),
      row.get('.version-value').text()
    ])

    expect(rows).toEqual([
      ['Kernel', '7.0.7'],
      ['systemd', '260.2'],
      ['bootc', '1.15.2'],
      ['Mesa', '26.0.6'],
      ['NVidia Driver', '595.71.05'],
      ['GNOME', '50.2'],
      ['PipeWire', '1.6.1']
    ])
  })

  it('does not display packages absent from the image SBOM', async () => {
    const wrapper = mountPicker()
    await vi.waitFor(() => {
      expect(wrapper.findAll('.wolves-download-grid .version-row').length).toBeGreaterThan(0)
    })

    const labels = wrapper.findAll('.wolves-download-grid .version-label').map(l => l.text())
    // Neither is present in the image SBOM, so neither may be displayed.
    expect(labels).not.toContain('Freedesktop SDK')
    expect(labels).not.toContain('Homebrew')
    expect(labels).not.toContain('Podman')
    expect(labels).not.toContain('Flatpak')
  })

  it('does not source Bluefin Server versions from Flatcar stream data', async () => {
    const wrapper = mountPicker()
    await vi.waitFor(() => {
      expect(wrapper.findAll('.wolves-download-grid .card-box')).toHaveLength(3)
    })

    expect(wrapper.text()).not.toContain('4593.2.1')
    expect(wrapper.text()).not.toContain('6.12.87')
  })

  it('does not display OGC Kernel when no verified gaming result exists', async () => {
    const wrapper = mountPicker()
    await vi.waitFor(() => {
      expect(wrapper.findAll('.wolves-download-grid .version-row').length).toBeGreaterThan(0)
    })

    const labels = wrapper.findAll('.wolves-download-grid .version-label').map(l => l.text())
    expect(labels).not.toContain('OGC Kernel')
  })
})
