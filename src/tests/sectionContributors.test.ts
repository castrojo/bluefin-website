import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SectionContributors from '../components/sections/SectionContributors.vue'
import { i18n } from '../locales/schema'

interface StubRepo { full_name: string, fork: boolean }

function person(login: string) {
  return { login, html_url: `https://github.com/${login}` }
}

function commitsBy(...logins: (string | null)[]) {
  return logins.map(login => ({ author: login === null ? null : person(login) }))
}

/**
 * Routes fetch by URL so each test declares only the endpoints it cares about.
 * Anything unrouted answers with an empty array, which is what the component
 * sees for a repository nobody has touched in the activity window.
 */
function routeFetch(routes: Array<[RegExp, () => unknown]>) {
  const calls: string[] = []
  const fetchMock = vi.fn(async (url: string) => {
    calls.push(url)
    for (const [pattern, respond] of routes) {
      if (pattern.test(url)) {
        const body = respond()
        if (body instanceof Error) {
          return { ok: false, status: 503, json: async () => ({}) }
        }
        return { ok: true, status: 200, json: async () => body }
      }
    }
    return { ok: true, status: 200, json: async () => [] }
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

function mountContributors() {
  return mount(SectionContributors, { global: { plugins: [i18n] } })
}

// The component walks paginated endpoints in a loop, so a single flush is not
// enough to drain every awaited page.
async function settle(times = 8) {
  for (let i = 0; i < times; i += 1) {
    await flushPromises()
  }
}

describe('sectionContributors.vue', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows the loading state before GitHub answers', async () => {
    routeFetch([])
    const wrapper = mountContributors()

    expect(wrapper.get('.contributors-state').text()).toContain('Loading GitHub activity')
    expect(wrapper.find('.activity-list').exists()).toBe(false)
    // Drain the in-flight load so the stub, not the real network, answers it.
    await settle()
  })

  it('renders the i18n copy and both call-to-action links', async () => {
    routeFetch([])
    const wrapper = mountContributors()

    const heading = wrapper.get('.contributors-header h2').text()
    expect(heading).toBe(i18n.global.t('Community.Contribute.Tag'))
    expect(heading).not.toContain('Community.')

    const buttons = wrapper.findAll('.contributors-button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('href')).toBe('https://github.com/ublue-os/bluefin')
    expect(buttons[1].attributes('href')).toBe('https://docs.projectbluefin.io/donations')
    buttons.forEach((button) => {
      expect(button.attributes('target')).toBe('_blank')
      expect(button.attributes('rel')).toBe('noopener noreferrer')
    })
    await settle()
  })

  it('labels the activity window with a month and year, not a raw date', async () => {
    routeFetch([])
    const wrapper = mountContributors()

    const summary = wrapper.get('.contributors-summary').text()
    const expected = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    expect(summary).toBe(`Contributors active since ${expected}.`)
    await settle()
  })

  it('lists commit authors sorted by login and links each to their profile', async () => {
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [] as StubRepo[]],
      [/ublue-os\/bluefin\/commits/, () => commitsBy('zoe', 'adam')],
    ])
    const wrapper = mountContributors()
    await settle()

    const rows = wrapper.findAll('.activity-row')
    expect(rows.map(row => row.get('.contributor-name').text())).toEqual(['adam', 'zoe'])
    expect(rows[0].attributes('href')).toBe('https://github.com/adam')
    expect(rows[0].attributes('target')).toBe('_blank')
    expect(wrapper.find('.activity-footer').attributes('href')).toBe('https://github.com/ublue-os/bluefin/pulse')
  })

  it('drops bot identities, including Copilot and any [bot] suffix', async () => {
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [] as StubRepo[]],
      [/ublue-os\/bluefin\/commits/, () => commitsBy(
        'Copilot',
        'dependabot[bot]',
        'github-actions[bot]',
        'renovate[bot]',
        'ubot-7274[bot]',
        'some-other[bot]',
        'realperson',
      )],
    ])
    const wrapper = mountContributors()
    await settle()

    const names = wrapper.findAll('.contributor-name').map(n => n.text())
    expect(names).toEqual(['realperson'])
  })

  it('ignores commits with no linked GitHub account', async () => {
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [] as StubRepo[]],
      [/ublue-os\/bluefin\/commits/, () => commitsBy(null, 'mapped')],
    ])
    const wrapper = mountContributors()
    await settle()

    expect(wrapper.findAll('.contributor-name').map(n => n.text())).toEqual(['mapped'])
  })

  it('de-duplicates a contributor seen in more than one repository', async () => {
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [] as StubRepo[]],
      [/ublue-os\/bluefin\/commits/, () => commitsBy('shared')],
      [/ublue-os\/bluefin-lts\/commits/, () => commitsBy('shared')],
    ])
    const wrapper = mountContributors()
    await settle()

    expect(wrapper.findAll('.contributor-name').map(n => n.text())).toEqual(['shared'])
  })

  it('queries org repositories but skips forks, and still queries the two pinned repos', async () => {
    const { calls } = routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [
        { full_name: 'projectbluefin/common', fork: false },
        { full_name: 'projectbluefin/a-fork', fork: true },
        // Already pinned below — must not be requested twice.
        { full_name: 'ublue-os/bluefin', fork: false },
      ] satisfies StubRepo[]],
    ])
    mountContributors()
    await settle()

    const commitCalls = calls.filter(url => url.includes('/commits'))
    const repos = commitCalls.map(url => url.match(/repos\/(.+?)\/commits/)![1])
    expect(repos).toContain('projectbluefin/common')
    expect(repos).toContain('ublue-os/bluefin')
    expect(repos).toContain('ublue-os/bluefin-lts')
    expect(repos).not.toContain('projectbluefin/a-fork')
    expect(repos.filter(repo => repo === 'ublue-os/bluefin')).toHaveLength(1)
  })

  it('falls back to the two pinned repositories when the org listing fails', async () => {
    const { calls } = routeFetch([
      [/orgs\/projectbluefin\/repos/, () => new Error('org listing down')],
      [/ublue-os\/bluefin\/commits/, () => commitsBy('fallback-person')],
    ])
    const wrapper = mountContributors()
    await settle()

    const repos = calls
      .filter(url => url.includes('/commits'))
      .map(url => url.match(/repos\/(.+?)\/commits/)![1])
    expect(repos.sort()).toEqual(['ublue-os/bluefin', 'ublue-os/bluefin-lts'])
    expect(wrapper.findAll('.contributor-name').map(n => n.text())).toEqual(['fallback-person'])
  })

  it('keeps commit authors visible when one repository errors out', async () => {
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [{ full_name: 'projectbluefin/common', fork: false }] satisfies StubRepo[]],
      [/projectbluefin\/common\/commits/, () => new Error('rate limited')],
      [/ublue-os\/bluefin\/commits/, () => commitsBy('survivor')],
    ])
    const wrapper = mountContributors()
    await settle()

    expect(wrapper.findAll('.contributor-name').map(n => n.text())).toEqual(['survivor'])
  })

  it('follows pagination until a short page ends the walk', async () => {
    const firstPage = commitsBy(...Array.from({ length: 100 }, (_, i) => `dev${String(i).padStart(3, '0')}`))
    let pageRequests = 0
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [] as StubRepo[]],
      [/ublue-os\/bluefin\/commits/, () => {
        pageRequests += 1
        return pageRequests === 1 ? firstPage : commitsBy('lastpageperson')
      }],
    ])
    const wrapper = mountContributors()
    await settle(12)

    expect(pageRequests).toBe(2)
    // Page 2 was reached, so its author is in the candidate pool; the alphabetical
    // sort then truncates to 12 and 'dev...' entries win.
    const names = wrapper.findAll('.contributor-name').map(n => n.text())
    expect(names).toHaveLength(12)
    expect(names[0]).toBe('dev000')
  })

  it('caps the rendered list at 12 contributors', async () => {
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [] as StubRepo[]],
      [/ublue-os\/bluefin\/commits/, () => commitsBy(...Array.from({ length: 30 }, (_, i) => `dev${String(i).padStart(2, '0')}`))],
    ])
    const wrapper = mountContributors()
    await settle()

    expect(wrapper.findAll('.activity-row')).toHaveLength(12)
  })

  it('includes discussion participants inside the activity window and excludes older ones', async () => {
    const recent = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const stale = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString()
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [] as StubRepo[]],
      [/discussions/, () => [
        { user: person('recent-talker'), created_at: recent },
        { user: person('ancient-talker'), created_at: stale },
      ]],
    ])
    const wrapper = mountContributors()
    await settle()

    const names = wrapper.findAll('.contributor-name').map(n => n.text())
    expect(names).toContain('recent-talker')
    expect(names).not.toContain('ancient-talker')
  })

  it('still renders commit authors when the discussions endpoint fails', async () => {
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [] as StubRepo[]],
      [/ublue-os\/bluefin\/commits/, () => commitsBy('committer')],
      [/discussions/, () => new Error('discussions disabled')],
    ])
    const wrapper = mountContributors()
    await settle()

    expect(wrapper.findAll('.contributor-name').map(n => n.text())).toEqual(['committer'])
    expect(wrapper.find('.contributors-state').exists()).toBe(false)
  })

  it('shows the unavailable state with a pulse link when nobody is found', async () => {
    routeFetch([
      [/orgs\/projectbluefin\/repos/, () => [] as StubRepo[]],
    ])
    const wrapper = mountContributors()
    await settle()

    const state = wrapper.get('.contributors-state')
    expect(state.text()).toContain('GitHub activity is unavailable right now.')
    expect(state.get('a').attributes('href')).toBe('https://github.com/ublue-os/bluefin/pulse')
    expect(wrapper.find('.activity-list').exists()).toBe(false)
  })

  it('shows the unavailable state when fetch itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('network down')
    }))
    const wrapper = mountContributors()
    await settle()

    expect(wrapper.get('.contributors-state').text()).toContain('GitHub activity is unavailable right now.')
  })

  it('marks the contributor list as a live region so screen readers hear updates', async () => {
    routeFetch([])
    const wrapper = mountContributors()

    expect(wrapper.get('.contributors-list').attributes('aria-live')).toBe('polite')
    await settle()
  })
})
