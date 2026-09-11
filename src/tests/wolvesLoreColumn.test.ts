import type { VueWrapper } from '@vue/test-utils'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getChatlogLore, getQuoteLore, loreRecords } from '../components/wolves/lore'
import {
  CHAT_PAGE_CHARACTERS,
  estimatePageSeconds,
  estimatePagesSeconds,
  loreChatPages,
  loreProsePages,
  PROSE_PAGE_CHARACTERS,
} from '../components/wolves/lore/lore-pages'
import { splitReadableBeats } from '../components/wolves/lore/readable-beats'
import WolvesLoreColumn from '../components/wolves/WolvesLoreColumn.vue'
import { DIRECTORS_CUT_FINALE_ANCHORS } from '../data/wolves-directors-cut-finale'
import {
  DIRECTORS_CUT_BULLETIN_ARTIFACT_ID,
  DIRECTORS_CUT_QUOTE_IDS,
  getDirectorsCutNarrativeSlotForTime,
  wolvesDirectorsCutNarrativeTimeline,
} from '../data/wolves-directors-cut-timeline'
import { parseLoreRecord } from '../data/wolves-lore-records'
import { getNarrativeSlotForTime, wolvesNarrativeTimeline } from '../data/wolves-narrative-timeline'
import { wolvesRelease } from '../data/wolves-story'
import { getWolvesThesisState } from '../data/wolves-thesis-sequence'
import { TRACK_ZERO_SECTIONS } from '../data/wolves-track-zero-beats'
import { wolvesLoreRecordFixtures } from './fixtures/wolves-lore-records'

interface ObservedBeat {
  speaker: string
  text: string
  continuation: string
  isSfx: boolean
}

/**
 * Play a transmission by moving the player clock, not by running timers. The
 * chat view is a page display driven by `elapsed`, so walking the slot is the
 * only honest way to see what an audience sees.
 */
async function playChat(wrapper: VueWrapper, duration: number, steps = 600): Promise<ObservedBeat[]> {
  const observed: ObservedBeat[] = []

  for (let step = 0; step <= steps; step++) {
    await wrapper.setProps({ elapsed: (duration * step) / steps })

    const message = wrapper.find('.conversation-message')
    if (!message.exists()) {
      continue
    }

    const beat: ObservedBeat = {
      speaker: message.find('.conversation-speaker').exists()
        ? message.find('.conversation-speaker').text()
        : '',
      text: message.find('p').exists() ? message.find('p').text() : '',
      continuation: message.attributes('data-chatlog-beat-continuation') ?? 'false',
      isSfx: message.classes('sfx-message'),
    }

    const previous = observed[observed.length - 1]
    if (!previous || previous.text !== beat.text || previous.speaker !== beat.speaker) {
      observed.push(beat)
    }
  }

  return observed
}

/** What a chatlog record costs to read at the show's page pace. */
function chatReadSeconds(body: string): number {
  return estimatePagesSeconds(loreChatPages(body))
}

describe('wolvesLoreColumn Logic', () => {
  it('renders the narrative record in a unified surface without the removed dossier directory', () => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'arthur-c-clarke-3',
        duration: 20,
      },
    })

    expect(wrapper.find('[data-unified-lore-feed]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('[ NARRATIVE FEED ]')
    expect(wrapper.text()).not.toContain('[ DOSSIER ARCHIVE ]')
    expect(wrapper.find('[data-lore-view-kind="quote"]').exists()).toBe(true)

    // The dossier directory (index, links, and return-to-current-record
    // navigation) has been removed entirely; only the timeline-selected
    // record surface remains.
    expect(wrapper.find('[data-dossier-directory]').exists()).toBe(false)
    expect(wrapper.find('[data-dossier-record-id]').exists()).toBe(false)
    expect(wrapper.find('[data-back-to-current-record]').exists()).toBe(false)
  })

  it('renders the artifact selected by the soundtrack timeline', async () => {
    vi.useFakeTimers()
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'arthur-c-clarke-3',
        duration: 20,
      },
    })

    await vi.advanceTimersByTimeAsync(5_000)
    expect(wrapper.find('[data-lore-view-kind="quote"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('It is a bitter thought, but you must face it.')
  })

  it.each([
    ['arthur-c-clarke-3', 'quote'],
    ['lorem-prologue-1', 'chatlog'],
  ])('renders %s as a record surface without the generic monitor console', (artifactId, kind) => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId,
        duration: 20,
      },
    })

    expect(wrapper.get(`[data-lore-view-kind="${kind}"]`).text()).not.toContain('nimbinatus@blue-universal:~$ monitor --archive')
    expect(wrapper.text()).not.toContain('// se7en.days')
  })

  it('types quote source characters without generated glyphs', async () => {
    vi.useFakeTimers()
    const record = loreRecords.find(record => record.id === 'arthur-c-clarke-3')
    if (!record || record.kind !== 'quote') {
      throw new Error('Expected a quote fixture')
    }
    const quote = getQuoteLore(record)

    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        duration: 1,
      },
    })

    vi.advanceTimersByTime(50)
    await wrapper.vm.$nextTick()

    const renderedQuote = wrapper.find('.lore-quote-text').text()
    expect(renderedQuote).not.toBe('')
    expect(quote.quote.startsWith(renderedQuote)).toBe(true)
  })

  it('renders an authored quote attribution over its title', () => {
    const record = loreRecords.find(record => record.id === 'arthur-c-clarke-2')
    if (!record || record.kind !== 'quote') {
      throw new Error('Expected the Arthur C. Clarke quote fixture')
    }
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        duration: 20,
      },
    })

    expect(record.diagnostics).toEqual([])
    expect(wrapper.get('.lore-quote-meta strong').text()).toBe('Arthur C. Clarke')
  })

  it.each(loreRecords.filter(record => record.kind === 'quote'))(
    'renders authored quote attribution and context for $id',
    (record) => {
      const wrapper = mount(WolvesLoreColumn, {
        props: {
          artifactId: record.id,
          duration: 20,
        },
      })

      expect(wrapper.get('.lore-quote-meta strong').text()).toBe(record.metadata.attribution)
      const context = wrapper.find('[data-lore-quote-context]')
      if (record.metadata.context) {
        expect(context.text()).toBe(record.metadata.context.trimEnd())
      }
      else {
        expect(context.exists()).toBe(false)
      }
    },
  )

  it('renders Arthur C. Clarke Childhood’s End quote identity without a trailing dash', () => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'arthur-c-clarke-1',
        duration: 20,
      },
    })

    expect(wrapper.get('.lore-quote-meta strong').text()).toBe('Arthur C. Clarke')
    expect(wrapper.get('[data-lore-quote-context]').text()).toBe('Childhood\'s End')
  })

  it('rejects quote rendering without authored attribution instead of falling back to a legacy label', () => {
    const record = parseLoreRecord('quote-natasha-woods', 'prologue', './lore/quote-natasha-woods.md', [
      '---',
      'kind: quote',
      'title: Legacy source label',
      'timestamp: \'2326-07-14\'',
      '---',
      '',
      'Authored body',
    ].join('\n'))

    expect(() => getQuoteLore(record)).toThrow('missing authored attribution')
  })

  it('does not retain legacy source labels for migrated quote identity', () => {
    const quoteIds = new Set(loreRecords
      .filter(record => record.kind === 'quote')
      .map(record => record.id))
    const quoteArtifacts = wolvesRelease.artifacts.filter(artifact => quoteIds.has(artifact.id))

    expect(quoteArtifacts).toHaveLength(18)
    expect(quoteArtifacts.every(artifact => !Object.prototype.hasOwnProperty.call(artifact, 'sourceLabel'))).toBe(true)
  })

  it('types transmission source characters without generated glyphs', async () => {
    vi.useFakeTimers()
    const record = loreRecords.find(record => record.id === 'lorem-prologue-1')
    if (!record || record.kind !== 'chatlog') {
      throw new Error('Expected a transmission fixture')
    }
    const chatlog = getChatlogLore(record)

    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        duration: 0.01,
      },
    })

    vi.advanceTimersByTime(50)
    await wrapper.vm.$nextTick()

    const renderedMessage = wrapper.find('.conversation-message p').text()
    expect(renderedMessage).not.toBe('')
    expect(wrapper.find('[data-lore-view-kind="chatlog"]').exists()).toBe(true)
    expect(chatlog.messages[0].text.startsWith(renderedMessage)).toBe(true)
  })

  it('keeps chat typing at a readable pace in a short narrative slot', async () => {
    vi.useFakeTimers()
    const record = loreRecords.find(record => record.id === 'lorem-prologue-1')
    if (!record || record.kind !== 'chatlog') {
      throw new Error('Expected a chatlog fixture')
    }
    const chatlog = getChatlogLore(record)
    const firstMessage = chatlog.messages[0]
    if (!firstMessage) {
      throw new Error('Expected the chatlog fixture to contain a message')
    }

    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        duration: 0.01,
      },
    })

    await vi.advanceTimersByTimeAsync(50)

    expect(firstMessage.text.startsWith(wrapper.find('.conversation-message p').text())).toBe(true)
  })

  it('renders Jordan and Adrian as automatic readable beats without narrative controls', async () => {
    const record = loreRecords.find(record => record.id === 'jordan-adrian')
    if (!record || record.kind !== 'chatlog') {
      throw new Error('Expected the Jordan and Adrian transmission fixture')
    }
    const chatlog = getChatlogLore(record)
    // The renderer must show exactly the pages the scheduler costed, in order.
    const expectedBeats = chatlog.messages.flatMap(message =>
      splitReadableBeats(message.text, CHAT_PAGE_CHARACTERS).map((text, index) => ({
        speaker: message.speaker ?? '',
        text,
        continuation: String(index > 0),
      })),
    )
    const duration = chatReadSeconds(record.body)
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        duration,
        elapsed: 0,
      },
    })
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo')
    const viewport = wrapper.get('.quote-viewport')
    const beforeClick = wrapper.text()

    expect(viewport.attributes('onClick')).toBeUndefined()
    await viewport.trigger('click')
    expect(wrapper.text()).toBe(beforeClick)

    const observed = await playChat(wrapper, duration)

    // One page at a time, every authored beat shown, in authored order.
    expect(wrapper.findAll('.conversation-message')).toHaveLength(1)
    expect(observed.map(beat => ({
      speaker: beat.speaker,
      text: beat.text,
      continuation: beat.continuation,
    }))).toEqual(expectedBeats)
    expect(observed.some(beat => beat.speaker === 'Jordan')).toBe(true)
    expect(observed.some(beat => beat.speaker === 'Adrian')).toBe(true)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('renders The Children sound effects with the established SFX treatment', async () => {
    const record = loreRecords.find(record => record.id === 'lorem-prologue-2')
    if (!record || record.kind !== 'chatlog') {
      throw new Error('Expected The Children transmission fixture')
    }
    const duration = chatReadSeconds(record.body)
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        duration,
        elapsed: 0,
      },
    })

    const observed = await playChat(wrapper, duration)
    const effects = observed.filter(beat => beat.isSfx)

    expect(effects.map(beat => beat.text)).toEqual([
      'static noise and distant explosions',
      'heavy static',
      'connection dropping',
    ])
    // A sound effect is stage direction, not a speaker, so it carries no header.
    expect(effects.every(beat => beat.speaker === '')).toBe(true)
  })

  it('keeps project-linked chats passive without audience-operated tabs', () => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'openssf-reinforcements',
        duration: 20,
      },
    })

    expect(wrapper.find('[data-chatlog-project-tabs]').exists()).toBe(false)
    expect(wrapper.find('[data-chatlog-project-panel]').exists()).toBe(false)
  })

  it('automatically holds complete quote pages without audience controls', async () => {
    const record = loreRecords
      .filter(record => record.kind === 'quote')
      .reduce((longest, record) => record.body.length > longest.body.length ? record : longest)
    if (record.kind !== 'quote') {
      throw new Error('Expected a quote fixture')
    }
    const pages = loreProsePages(getQuoteLore(record).quote)
    expect(pages.length).toBeGreaterThan(1)
    const firstPageSeconds = estimatePageSeconds(pages[0]!)
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        // A slot only ever shows the whole pages it can hold.
        duration: estimatePagesSeconds(pages),
        elapsed: 0,
      },
    })
    const viewport = wrapper.get('.quote-viewport')

    expect(viewport.attributes('onClick')).toBeUndefined()
    const firstPage = wrapper.get('.lore-quote-text').text()
    expect(firstPage).toBe(pages[0])
    expect(wrapper.get('.lore-quote-text').attributes('data-quote-beat-index')).toBe('0')

    await wrapper.setProps({ elapsed: firstPageSeconds - 1 })
    expect(wrapper.get('.lore-quote-text').text()).toBe(firstPage)

    await wrapper.setProps({ elapsed: firstPageSeconds + 1 })
    expect(wrapper.get('.lore-quote-text').attributes('data-quote-beat-index')).not.toBe('0')
  })

  it('never splits a quote that fits one page', () => {
    const shortQuotes = loreRecords.filter(record =>
      record.kind === 'quote' && record.body.length <= PROSE_PAGE_CHARACTERS,
    )

    expect(shortQuotes.length).toBeGreaterThan(0)
    for (const record of shortQuotes) {
      expect(loreProsePages(getQuoteLore(record).quote)).toHaveLength(1)
    }
  })

  it('renders one metadata block with the same structure for every lore view', () => {
    const views = [
      { artifactId: 'arthur-c-clarke-3', records: undefined },
      { artifactId: 'lorem-prologue-1', records: undefined },
      ...wolvesLoreRecordFixtures.map(record => ({
        artifactId: record.id,
        records: wolvesLoreRecordFixtures,
      })),
    ]

    expect(views).toHaveLength(9)
    for (const view of views) {
      const wrapper = mount(WolvesLoreColumn, {
        props: { artifactId: view.artifactId, duration: 20, records: view.records },
      })

      const header = wrapper.get('[data-lore-header]')
      expect(header.element.parentElement?.classList).toContain('lore-dossier-panel')
      expect(header.get('[data-lore-eyebrow]').text()).toBe(header.get('[data-lore-eyebrow]').text().toUpperCase())
      expect(header.get('[data-lore-eyebrow]').text()).not.toBe('')
      expect(header.get('[data-lore-title]').text()).not.toBe('')
      expect(wrapper.findAll('[data-lore-header]')).toHaveLength(1)
      // Telemetry footers are noise on a theater screen and stay deleted.
      expect(wrapper.find('.lore-dossier-footer').exists()).toBe(false)
    }
  })

  it('renders the GuardianBond eyebrow as two words', () => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'guardian-dinosaur',
        duration: 20,
        records: wolvesLoreRecordFixtures,
      },
    })

    expect(wrapper.get('[data-lore-eyebrow]').text()).toBe('GUARDIAN BOND')
  })

  it('never scrolls or pans a lore surface as the player clock advances', async () => {
    const scrollTop = vi.fn()
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop')
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: scrollTop,
    })

    try {
      const wrapper = mount(WolvesLoreColumn, {
        props: { artifactId: 'ishtar-flower-game', duration: 30, elapsed: 0 },
      })

      for (const elapsed of [5, 10, 20, 29]) {
        await wrapper.setProps({ elapsed })
      }

      expect(scrollTop).not.toHaveBeenCalled()
      expect(wrapper.find('[style*="overflow"]').exists()).toBe(false)
    }
    finally {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollTop', descriptor)
      }
    }
  })

  it('keeps every lore view on the shared theater type scale', async () => {
    const directory = resolve(process.cwd(), 'src/components/wolves/lore')
    const views = (await readdir(directory)).filter(name => name.endsWith('.vue'))

    expect(views.length).toBeGreaterThanOrEqual(9)
    for (const view of views) {
      const source = await readFile(join(directory, view), 'utf8')
      const declarations = source.match(/font-size:[^;]+/g) ?? []
      for (const declaration of declarations) {
        expect(declaration).toContain('var(--lore-')
      }
    }
  })

  it('reveals the Golden Era vision and preserves Sarah pacing without narrative controls', async () => {
    const record = loreRecords.find(record => record.id === 'lorem-pursuit-1')
    if (!record || record.kind !== 'chatlog') {
      throw new Error('Expected the Golden Era transmission fixture')
    }
    const chatlog = getChatlogLore(record)
    const saintclair = chatlog.messages.find(message => message.speaker === 'SAINTCLAIR')
    const climaxMessage = chatlog.messages.find(message => message.speaker === 'BUR//S')
    const sarah = [...chatlog.messages].reverse().find(message => message.speaker === 'SARAH')
    if (!saintclair || !climaxMessage || !sarah) {
      throw new Error('Expected the Golden Era conversation fixtures')
    }

    const vision = climaxMessage.text.slice(climaxMessage.text.indexOf('. ') + 2)
    const duration = chatReadSeconds(record.body)
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        duration,
        elapsed: 0,
      },
    })
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo')
    const viewport = wrapper.get('.quote-viewport')
    const beforeClick = wrapper.text()

    expect(viewport.attributes('onClick')).toBeUndefined()
    await viewport.trigger('click')
    expect(wrapper.text()).toBe(beforeClick)

    const observed = await playChat(wrapper, duration)
    const spoken = (speaker: string) => observed
      .filter(beat => beat.speaker === speaker)
      .map(beat => beat.text)
      .join(' ')

    expect(spoken('SAINTCLAIR')).toContain(saintclair.text)
    // The vision is the payload of the conversation; it must reach the screen
    // whole rather than being cut off with the slot.
    expect(spoken('BUR//S')).toContain(vision)
    // Sarah closes the transmission, and hers is the last thing left standing.
    expect(observed[observed.length - 1]!.speaker).toBe('SARAH')
    expect(sarah.text).toContain(observed[observed.length - 1]!.text)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('lands Sarah\u2019s closing line on the chanting bridge', async () => {
    const record = loreRecords.find(record => record.id === 'lorem-pursuit-1')
    const slot = wolvesNarrativeTimeline.find(slot => slot.artifactId === 'lorem-pursuit-1')
    if (!record || record.kind !== 'chatlog' || !slot) {
      throw new Error('Expected the Golden Era transmission and its scheduled slot')
    }
    const duration = slot.endTime - slot.startTime
    const chatPages = loreChatPages(record.body)
    const finalBeat = chatPages[chatPages.length - 1]!
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        duration,
        elapsed: 0,
      },
    })

    // A hair before the bridge the audience is still on the line before it.
    await wrapper.setProps({ elapsed: TRACK_ZERO_SECTIONS.bridgeStart - slot.startTime - 0.5 })
    expect(wrapper.find('.conversation-message p').text()).not.toBe(finalBeat)

    // On the beat, and for the rest of the slot, Sarah's closing line stands.
    for (const time of [TRACK_ZERO_SECTIONS.bridgeStart, slot.endTime - 0.01]) {
      await wrapper.setProps({ elapsed: time - slot.startTime })
      expect(wrapper.find('.conversation-message p').text()).toBe(finalBeat)
    }
  })

  it('keeps the finale chat noninteractive after its key line is revealed', async () => {
    vi.useFakeTimers()
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'committee-report-personal-transmission',
        duration: 0.01,
      },
    })
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo')
    const viewport = wrapper.get('.quote-viewport')
    const beforeClick = wrapper.text()

    expect(viewport.attributes('onClick')).toBeUndefined()
    await viewport.trigger('click')
    expect(wrapper.text()).toBe(beforeClick)
    await vi.advanceTimersByTimeAsync(20_000)

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('holds the closing line of a conversation until its slot ends', async () => {
    const record = loreRecords.find(record => record.id === 'lorem-prologue-1')
    if (!record || record.kind !== 'chatlog') {
      throw new Error('Expected a chatlog fixture')
    }
    // A slot longer than the conversation costs to read: the surplus is spent
    // holding the last line, never on blanking the panel early.
    const duration = chatReadSeconds(record.body) + 20
    const chatPages = loreChatPages(record.body)
    const finalBeat = chatPages[chatPages.length - 1]!
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: record.id,
        duration,
        elapsed: 0,
      },
    })

    for (const elapsed of [duration - 15, duration - 5, duration - 0.01]) {
      await wrapper.setProps({ elapsed })
      expect(wrapper.find('.conversation-message p').text()).toBe(finalBeat)
    }
  })

  it('replaces the full lore column with a vertical dinosaur dossier', () => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'dinosaur-subject',
        duration: 20,
        records: wolvesLoreRecordFixtures,
      },
    })

    expect(wrapper.find('[data-lore-view="dinosaur-dossier"]').exists()).toBe(true)
    expect(wrapper.get('[data-species-artwork]').attributes('src')).toContain('characters/achillobator.webp')
    expect(wrapper.text()).toContain('bond: guardian-dinosaur')
    // Bond identity renders exactly once: as the spec-list cross-reference.
    expect(wrapper.text()).not.toContain('GUARDIANBOND /')
    expect(wrapper.text()).not.toContain('BONDED RIDER /')
    expect(wrapper.find('.mascot-console-hud').exists()).toBe(false)
  })

  it('renders canonical source provenance independently of authored body text', () => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'ishtar-gardener-and-winnower',
        duration: 20,
      },
    })

    expect(wrapper.text()).toContain('provenance: https://www.ishtar-collective.net/entries/gardener-and-winnower')
  })

  it.each([405, 425])('renders the thesis warning beside the final news artifact at Track 0 %is', (time) => {
    const thesisState = getWolvesThesisState(time)
    const finalSlot = getNarrativeSlotForTime(time)
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: finalSlot.artifactId,
        duration: finalSlot.endTime - finalSlot.startTime,
        warning: thesisState.warning,
      },
    })

    // startTime is derived from the finale beat, not a round number; the
    // anchor itself is asserted in wolvesNarrativeTimeline/wolvesFinaleReveal.
    expect(finalSlot).toMatchObject({
      artifactId: 'blue-universal-acquires-wayland-yutani',
      endTime: 425,
    })
    expect(thesisState.warning).toBe('truly a great loss for humanity.')
    expect(wrapper.find('[data-lore-view="news-bulletin"]').exists()).toBe(true)
    expect(wrapper.get('[data-lore-warning]').classes()).toContain('thesis-warning-fade')
    expect(wrapper.get('[data-lore-warning]').text()).toBe(thesisState.warning)
    if (thesisState.text) {
      expect(wrapper.text()).not.toContain(thesisState.text)
    }
  })

  it.each([
    ['news-record', 'news-bulletin'],
    ['source-record', 'source-fragment'],
    ['field-report-record', 'field-report'],
    ['location-record', 'location-dossier'],
    ['guardian-subject', 'guardian-dossier'],
    ['guardian-dinosaur', 'guardian-bond'],
  ])('routes %s to its dedicated full-column view', (artifactId, view) => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId,
        duration: 20,
        records: wolvesLoreRecordFixtures,
      },
    })

    expect(wrapper.find(`[data-lore-view="${view}"]`).exists()).toBe(true)
  })

  it('renders authored Guardian dossier fields with derived telemetry', () => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'guardian-subject',
        duration: 20,
        records: wolvesLoreRecordFixtures,
      },
    })

    expect(wrapper.text()).toContain('MAINTAINER // GUARDIAN')
    expect(wrapper.text()).toContain('CONTROLLER · RECONCILER')
    expect(wrapper.text()).toContain('class: titan')
    expect(wrapper.text()).toContain('super: Test super')
    expect(wrapper.text()).toContain('GuardianBond: guardian-dinosaur')
    expect(wrapper.text()).toContain('fnv1a:')
  })

  it('keeps the timeline-selected record current with no dossier navigation available', async () => {
    const wrapper = mount(WolvesLoreColumn, {
      props: {
        artifactId: 'arthur-c-clarke-3',
        duration: 20,
      },
    })

    // Selected record is the timeline-driven artifact (a quote), and there is
    // no dossier index or return-to-current-record control to navigate away
    // from it.
    expect(wrapper.find('[data-lore-view-kind="quote"]').exists()).toBe(true)
    expect(wrapper.find('[data-dossier-directory]').exists()).toBe(false)
    expect(wrapper.find('[data-dossier-record-id]').exists()).toBe(false)
    expect(wrapper.find('[data-back-to-current-record]').exists()).toBe(false)

    await wrapper.setProps({ artifactId: 'lorem-prologue-1' })
    await wrapper.vm.$nextTick()

    // Advancing the timeline-selected artifact still routes to its own view,
    // with the dossier navigation staying absent.
    expect(wrapper.find('[data-lore-view-kind="chatlog"]').exists()).toBe(true)
    expect(wrapper.find('[data-back-to-current-record]').exists()).toBe(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
})

/**
 * The Director's Cut panel, rendered rather than described.
 *
 * The schedule tests prove the nine quotes get readable windows. They cannot
 * prove the quote reaches the screen: the column resolves its own record by id,
 * and a scheduled id that no view can render, or a record whose attribution
 * lives under a metadata key the quote view does not read, is a blank panel in
 * a theater with a schedule that still passes.
 */
describe('director\'s cut lore column', () => {
  const slotAt = (time: number) => {
    const slot = getDirectorsCutNarrativeSlotForTime(time)
    if (!slot) {
      throw new Error(`no Director's Cut record scheduled at ${time}s`)
    }
    return slot
  }

  const mountSlot = (slot: { artifactId: string, startTime: number, endTime: number }, elapsed = 0.5) =>
    mount(WolvesLoreColumn, {
      props: {
        artifactId: slot.artifactId,
        duration: slot.endTime - slot.startTime,
        elapsed,
      },
    })

  it.each([
    ['opening', 0],
    ['middle', TRACK_ZERO_SECTIONS.chorusStart],
    ['closing', TRACK_ZERO_SECTIONS.buildStart],
  ])('renders the scheduled %s quote with its authored words, attribution and context', (_position, time) => {
    const slot = slotAt(time)
    const record = loreRecords.find(entry => entry.id === slot.artifactId)!
    const quote = getQuoteLore(record)
    const wrapper = mountSlot(slot)

    expect(wrapper.find('[data-lore-view-kind="quote"]').exists()).toBe(true)
    // Single-page by construction: a quote is never split across pages, so the
    // whole authored line is on screen for the whole window.
    expect(wrapper.get('.lore-quote-text').text().trim()).toBe(quote.quote.trim())
    expect(wrapper.get('.lore-quote-meta strong').text()).toBe(record.metadata.attribution)
    expect(wrapper.find('[data-lore-quote-context]').text()).toBe(record.metadata.context)
  })

  it('renders every scheduled quote whole, on one page, for the window it is given', () => {
    for (const id of DIRECTORS_CUT_QUOTE_IDS) {
      const slot = wolvesDirectorsCutNarrativeTimeline.find(entry => entry.artifactId === id)!
      const record = loreRecords.find(entry => entry.id === id)!
      const wrapper = mountSlot(slot, (slot.endTime - slot.startTime) - 0.1)

      expect(wrapper.get('.lore-quote-text').text().trim(), id).toBe(getQuoteLore(record).quote.trim())
      expect(wrapper.get('.lore-quote-meta strong').text(), id).toBe(record.metadata.attribution)
    }
  })

  it('renders the missing-scientist bulletin as a news record on its own window', () => {
    const slot = slotAt(DIRECTORS_CUT_FINALE_ANCHORS.bulletinStart)
    const wrapper = mountSlot(slot)

    expect(slot.artifactId).toBe(DIRECTORS_CUT_BULLETIN_ARTIFACT_ID)
    expect(wrapper.find('[data-lore-view="news-bulletin"]').exists()).toBe(true)
  })

  // The intervals between quotes are authored image-only frames. The column has
  // to go empty there, not hold the last record: a quote left on screen through
  // a gap is the stall this cut was re-timed to remove.
  it('renders an empty column through an image-only interval', () => {
    const firstQuote = wolvesDirectorsCutNarrativeTimeline[0]!
    const gapTime = firstQuote.endTime + 1
    expect(getDirectorsCutNarrativeSlotForTime(gapTime)).toBeNull()

    const wrapper = mount(WolvesLoreColumn, {
      props: { artifactId: '', duration: 10, elapsed: 0 },
    })

    expect(wrapper.find('[data-lore-view-kind]').exists()).toBe(false)
    expect(wrapper.get('[data-unified-lore-feed]').text()).toBe('')
  })
})
