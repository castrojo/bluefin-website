import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ImageChooser from '../components/ImageChooser.vue'
import { i18n } from '../locales/schema'

const STREAM_VERSIONS_YAML = `
lts:
  status: unavailable
stable:
  status: verified
  base: Fedora 42
  gnome: '50'
  kernel: 6.19.11
  mesa: 26.0.5
  nvidia: 595.71.05
`

function mountChooser() {
  return mount(ImageChooser, {
    global: {
      plugins: [i18n],
    },
  })
}

async function reachGpuStep(wrapper: ReturnType<typeof mountChooser>) {
  const stableBox = wrapper.findAll('.release-box')[1]
  await stableBox.trigger('click')
  const archButtons = wrapper.findAll('.step-selection .option-button')
  expect(archButtons).toHaveLength(1)
  await archButtons[0].trigger('click')
}

describe('imageChooser.vue', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders both releases with the lts release disabled and stable recommended', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => STREAM_VERSIONS_YAML,
    })))

    const wrapper = mountChooser()
    await flushPromises()

    const boxes = wrapper.findAll('.release-box')
    expect(boxes).toHaveLength(2)
    expect(boxes[0].classes()).toContain('disabled')
    expect(boxes[0].attributes('aria-disabled')).toBe('true')
    expect(boxes[0].get('.unavailable-badge').text()).toBe('Will return')
    expect(boxes[1].classes()).toContain('recommended')
    expect(boxes[1].get('.recommended-badge').text()).toBe('Recommended')

    // Version information from stream-versions.yml is rendered for verified streams only.
    expect(boxes[0].find('.version-info').exists()).toBe(false)
    expect(boxes[1].text()).toContain('Fedora 42')
  })

  it('ignores clicks on the disabled lts release', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))

    const wrapper = mountChooser()
    await wrapper.findAll('.release-box')[0].trigger('click')

    expect(wrapper.find('.release-selection').exists()).toBe(true)
    expect(wrapper.find('.step-selection').exists()).toBe(false)
  })

  it('walks stable → x86 → AMD and generates the plain ISO name and URLs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))

    const wrapper = mountChooser()
    await reachGpuStep(wrapper)

    const gpuButtons = wrapper.findAll('.step-selection .option-button')
    expect(gpuButtons).toHaveLength(2)
    expect(gpuButtons[0].text()).toBe('AMD or Intel')
    await gpuButtons[0].trigger('click')

    expect(wrapper.get('.filename-value').text()).toBe('bluefin-stable-x86_64.iso')
    expect(wrapper.get('a.download-button.primary').attributes('href'))
      .toBe('https://download.projectbluefin.io/bluefin-stable-x86_64.iso')
    expect(wrapper.get('a[title="Verify (SHA256)"]').attributes('href'))
      .toBe('https://download.projectbluefin.io/bluefin-stable-x86_64.iso-CHECKSUM')
  })

  it('uses the nvidia-open suffix for stable releases with Nvidia GPUs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))

    const wrapper = mountChooser()
    await reachGpuStep(wrapper)
    await wrapper.findAll('.step-selection .option-button')[1].trigger('click')

    expect(wrapper.get('.filename-value').text()).toBe('bluefin-nvidia-open-stable-x86_64.iso')
    expect(wrapper.get('a.download-button.primary').attributes('href'))
      .toBe('https://download.projectbluefin.io/bluefin-nvidia-open-stable-x86_64.iso')
  })

  it('navigates back from download to the GPU step and starts over from the beginning', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))

    const wrapper = mountChooser()
    await reachGpuStep(wrapper)
    await wrapper.findAll('.step-selection .option-button')[0].trigger('click')
    expect(wrapper.find('.download-section').exists()).toBe(true)

    await wrapper.get('.download-section .back-button').trigger('click')
    expect(wrapper.find('.download-section').exists()).toBe(false)
    expect(wrapper.get('.step-selection h3').text()).toContain('graphics')

    await wrapper.findAll('.step-selection .option-button')[0].trigger('click')
    await wrapper.get('.start-over-button').trigger('click')
    expect(wrapper.find('.release-selection').exists()).toBe(true)
    expect(wrapper.findAll('.release-box')).toHaveLength(2)
  })

  it('renders no version information when the versions fetch fails', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('offline')
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountChooser()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/stream-versions.yml')
    expect(wrapper.findAll('.release-box')).toHaveLength(2)
    expect(wrapper.find('.version-info').exists()).toBe(false)
  })

  it('renders no version information when the versions YAML is malformed', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => '{{{{ not yaml',
    }))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountChooser()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/stream-versions.yml')
    expect(wrapper.findAll('.release-box')).toHaveLength(2)
    expect(wrapper.find('.version-info').exists()).toBe(false)
  })

  it('does not render version chips for a stream with status unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => STREAM_VERSIONS_YAML,
    })))

    const wrapper = mountChooser()
    await flushPromises()

    const boxes = wrapper.findAll('.release-box')
    // LTS is unavailable — no version-info rendered
    expect(boxes[0].find('.version-info').exists()).toBe(false)
    // Stable is verified — version-info rendered
    expect(boxes[1].find('.version-info').exists()).toBe(true)
  })

  it('summarises the selection and links the release registry on the download step', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))

    const wrapper = mountChooser()
    await reachGpuStep(wrapper)
    await wrapper.findAll('.step-selection .option-button')[0].trigger('click')

    const summary = wrapper.get('.decision-summary')
    expect(summary.text()).toContain('Bluefin')
    expect(summary.text()).toContain('x86_64')
    expect(summary.text()).toContain('AMD/Intel')

    const registry = wrapper.get('a[title="View Registry"]')
    expect(registry.attributes('href'))
      .toBe('https://github.com/orgs/ublue-os/packages?repo_name=bluefin')
    expect(registry.attributes('target')).toBe('_blank')
  })

  it('fully resets so the same release can be selected again', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))

    const wrapper = mountChooser()
    await reachGpuStep(wrapper)
    await wrapper.findAll('.step-selection .option-button')[0].trigger('click')
    expect(wrapper.find('.download-section').exists()).toBe(true)

    await wrapper.get('.start-over-button').trigger('click')

    // Selecting the already-selected stable release again restarts the flow
    // at the architecture step with all downstream steps hidden.
    await wrapper.findAll('.release-box')[1].trigger('click')
    expect(wrapper.find('.release-selection').exists()).toBe(false)
    expect(wrapper.find('.download-section').exists()).toBe(false)

    const archButtons = wrapper.findAll('.step-selection .option-button')
    expect(archButtons).toHaveLength(1)
    await archButtons[0].trigger('click')
    expect(wrapper.findAll('.step-selection .option-button')).toHaveLength(2)
  })
})
