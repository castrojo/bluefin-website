import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ServerVersion from '../components/server/ServerVersion.vue'

describe('serverVersion.vue', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not fetch server-versions.json', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    mount(ServerVersion)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('contains no Flatcar version, kernel, Docker, containerd, Ignition, etcd, or NVIDIA rows', () => {
    const wrapper = mount(ServerVersion)
    const text = wrapper.text()

    for (const term of ['Kernel', 'systemd', 'containerd', 'Docker', 'Ignition', 'etcd']) {
      expect(text).not.toContain(term)
    }
    expect(wrapper.find('.component-grid').exists()).toBe(false)
    expect(wrapper.find('.version').exists()).toBe(false)
    expect(wrapper.find('.release-badge').exists()).toBe(false)
    expect(wrapper.find('.loading-state').exists()).toBe(false)
  })

  it('links to the GitHub releases page in a new tab', () => {
    const wrapper = mount(ServerVersion)

    const link = wrapper.get('a.release-link')
    expect(link.attributes('href')).toBe('https://github.com/projectbluefin/server/releases')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('renders non-version release guidance', () => {
    const wrapper = mount(ServerVersion)
    const text = wrapper.text()

    expect(text).toContain('GitHub')
    expect(text).toContain(
      'Version details will appear when Bluefin Server publishes a verifiable image SBOM.'
    )
  })
})
