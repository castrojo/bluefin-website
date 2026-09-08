import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ServerDemos from '../components/server/ServerDemos.vue'

const PHASES = ['cluster', 'cpu', 'storage', 'highlights', 'features'] as const
const DURATIONS = [5000, 5000, 5000, 10000, 15000]

function mountDemos() {
  return mount(ServerDemos, {
    global: {
      stubs: {
        // The two panel components have their own suites; stubbing keeps this
        // file focused on the carousel and drag behaviour.
        ServerHighlights: { template: '<div class="stub-highlights" />' },
        ServerFeatures: { template: '<div class="stub-features" />' },
      },
    },
  })
}

function urlText(wrapper: ReturnType<typeof mountDemos>) {
  return wrapper.get('.browser-url-text').text()
}

function activeTab(wrapper: ReturnType<typeof mountDemos>) {
  return wrapper.get('.tabs-container button.active').text()
}

describe('serverDemos.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts on the cluster phase with its screenshot and URL', () => {
    const wrapper = mountDemos()

    expect(activeTab(wrapper)).toBe('Cluster')
    expect(urlText(wrapper)).toBe('vanguard.local/cluster')
    expect(wrapper.get('img').attributes('alt')).toBe('Bluespeed cluster overview')
    wrapper.unmount()
  })

  it('renders one tab per phase, in order, with human labels', () => {
    const wrapper = mountDemos()

    const labels = wrapper.findAll('.tabs-container button').map(b => b.text())
    expect(labels).toEqual(['Cluster', 'Nodes', 'Storage', 'Highlights', 'Features'])
    wrapper.unmount()
  })

  it('advances through every phase on the scripted durations and wraps around', async () => {
    const wrapper = mountDemos()

    const seen: string[] = [urlText(wrapper)]
    for (let step = 0; step < PHASES.length; step += 1) {
      vi.advanceTimersByTime(DURATIONS[step])
      await wrapper.vm.$nextTick()
      seen.push(urlText(wrapper))
    }

    expect(seen).toEqual([
      'vanguard.local/cluster',
      'vanguard.local/nodes',
      'vanguard.local/storage',
      'vanguard.local/highlights',
      'vanguard.local/features',
      // Wrapped back to the start.
      'vanguard.local/cluster',
    ])
    wrapper.unmount()
  })

  it('does not advance early — the cluster slide holds for its full duration', async () => {
    const wrapper = mountDemos()

    vi.advanceTimersByTime(DURATIONS[0] - 1)
    await wrapper.vm.$nextTick()
    expect(urlText(wrapper)).toBe('vanguard.local/cluster')

    vi.advanceTimersByTime(1)
    await wrapper.vm.$nextTick()
    expect(urlText(wrapper)).toBe('vanguard.local/nodes')
    wrapper.unmount()
  })

  it('jumps to the clicked tab and resumes the cycle from there', async () => {
    const wrapper = mountDemos()
    const tabs = wrapper.findAll('.tabs-container button')

    await tabs[2].trigger('click')
    expect(activeTab(wrapper)).toBe('Storage')
    expect(urlText(wrapper)).toBe('vanguard.local/storage')
    expect(wrapper.get('img').attributes('alt')).toBe('Bluespeed storage')

    // Resuming from index 2 means the next hop is highlights, on storage's timing.
    vi.advanceTimersByTime(DURATIONS[2])
    await wrapper.vm.$nextTick()
    expect(urlText(wrapper)).toBe('vanguard.local/highlights')
    wrapper.unmount()
  })

  it('renders the highlights and features panels instead of a screenshot', async () => {
    const wrapper = mountDemos()
    const tabs = wrapper.findAll('.tabs-container button')

    await tabs[3].trigger('click')
    expect(wrapper.find('.stub-highlights').exists()).toBe(true)
    expect(wrapper.find('img').exists()).toBe(false)

    await tabs[4].trigger('click')
    expect(wrapper.find('.stub-features').exists()).toBe(true)
    expect(wrapper.find('.stub-highlights').exists()).toBe(false)
    wrapper.unmount()
  })

  it('pauses the carousel while a tab is hovered and resumes on leave', async () => {
    const wrapper = mountDemos()
    const tabs = wrapper.findAll('.tabs-container button')

    await tabs[0].trigger('mouseenter')
    vi.advanceTimersByTime(DURATIONS[0] * 4)
    await wrapper.vm.$nextTick()
    expect(urlText(wrapper)).toBe('vanguard.local/cluster')

    await tabs[0].trigger('mouseleave')
    vi.advanceTimersByTime(DURATIONS[0])
    await wrapper.vm.$nextTick()
    expect(urlText(wrapper)).toBe('vanguard.local/nodes')
    wrapper.unmount()
  })

  it('pauses the carousel while the slide area itself is hovered', async () => {
    const wrapper = mountDemos()

    await wrapper.get('.img-wrap').trigger('mouseenter')
    vi.advanceTimersByTime(DURATIONS[0] * 3)
    await wrapper.vm.$nextTick()
    expect(urlText(wrapper)).toBe('vanguard.local/cluster')

    await wrapper.get('.img-wrap').trigger('mouseleave')
    vi.advanceTimersByTime(DURATIONS[0])
    await wrapper.vm.$nextTick()
    expect(urlText(wrapper)).toBe('vanguard.local/nodes')
    wrapper.unmount()
  })

  it('scrolls the panel by the dragged distance and marks the drag state', async () => {
    const wrapper = mountDemos()
    await wrapper.findAll('.tabs-container button')[3].trigger('click')

    const inner = wrapper.get('.img-wrap-inner')
    const el = inner.element as HTMLElement
    el.scrollTop = 40

    await inner.trigger('mousedown', { button: 0, clientY: 100 })
    expect(inner.classes()).toContain('is-dragging')

    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 70 }))
    // Dragging up by 30px scrolls down by 30px from the starting offset.
    expect(el.scrollTop).toBe(70)

    document.dispatchEvent(new MouseEvent('mouseup'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.img-wrap-inner').classes()).not.toContain('is-dragging')

    // After mouseup the move listener is gone, so scrollTop must stop tracking.
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 10 }))
    expect(el.scrollTop).toBe(70)
    wrapper.unmount()
  })

  it('ignores non-primary mouse buttons so right-click does not start a drag', async () => {
    const wrapper = mountDemos()
    await wrapper.findAll('.tabs-container button')[3].trigger('click')

    const inner = wrapper.get('.img-wrap-inner')
    const el = inner.element as HTMLElement
    el.scrollTop = 25

    await inner.trigger('mousedown', { button: 2, clientY: 100 })
    expect(inner.classes()).not.toContain('is-dragging')

    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 0 }))
    expect(el.scrollTop).toBe(25)
    wrapper.unmount()
  })

  it('stops the timer and detaches drag listeners on unmount', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const wrapper = mountDemos()

    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))

    // No pending work may survive the component.
    expect(vi.getTimerCount()).toBe(0)
    removeSpy.mockRestore()
  })
})
