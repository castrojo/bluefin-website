import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ServerHighlights from '../components/server/ServerHighlights.vue'

describe('serverHighlights.vue', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not fetch server-versions.json', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    mount(ServerHighlights)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not render nvidia driver chips', () => {
    const wrapper = mount(ServerHighlights)

    expect(wrapper.find('.nvidia-chips').exists()).toBe(false)
    expect(wrapper.findAll('.chip.nvidia')).toHaveLength(0)
  })

  it('renders static brand items with expected links', () => {
    const wrapper = mount(ServerHighlights)

    const brandLinks = wrapper.findAll('.brand-title[href]')
    const hrefs = brandLinks.map(l => l.attributes('href'))
    expect(hrefs).toContain('https://freedesktop-sdk.io')
    expect(hrefs).toContain('https://github.com/NVIDIA/go-nvlib')
    expect(hrefs).toContain('https://kubestellar.io')
  })
})
