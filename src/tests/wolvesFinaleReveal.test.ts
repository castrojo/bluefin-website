import { describe, expect, it } from 'vitest'
import { parseLoreSpeakerParagraphs, rebuildLoreSpeakerParagraph } from '../components/wolves/lore'
import { estimatePagesSeconds, loreChatPages, loreProsePages, pickBlockPage, pickPageIndexForElapsed } from '../components/wolves/lore/lore-pages'
import { DIRECTORS_CUT_FINALE_ANCHORS } from '../data/wolves-directors-cut-finale'
import { wolvesDirectorsCutNarrativeTimeline } from '../data/wolves-directors-cut-timeline'
import { loadAllLoreRecords } from '../data/wolves-lore-records'
import { wolvesNarrativeTimeline } from '../data/wolves-narrative-timeline'
import { getWolvesThesisState } from '../data/wolves-thesis-sequence'
import { TRACK_ZERO_SECTIONS } from '../data/wolves-track-zero-beats'

const FINAL_ID = 'blue-universal-acquires-wayland-yutani'
const BEAT = TRACK_ZERO_SECTIONS.finaleStart

function finalSlot() {
  const slot = wolvesNarrativeTimeline.find(entry => entry.artifactId === FINAL_ID)
  expect(slot, 'closing bulletin is missing from the timeline').toBeDefined()
  return slot!
}

let cachedRecord: ReturnType<typeof loadAllLoreRecords>[number] | undefined
function getFinalRecord() {
  if (!cachedRecord) {
    cachedRecord = loadAllLoreRecords().find(entry => entry.id === FINAL_ID)!
  }
  return cachedRecord
}

let cachedPages: string[] | undefined
function getFinalPages() {
  if (!cachedPages) {
    cachedPages = loreProsePages(getFinalRecord().body)
  }
  return cachedPages
}

let cachedBlocks: ReturnType<typeof parseLoreSpeakerParagraphs> | undefined
function getFinalBlocks() {
  if (!cachedBlocks) {
    cachedBlocks = parseLoreSpeakerParagraphs(getFinalRecord().body)
  }
  return cachedBlocks
}

function pageAt(time: number) {
  const slot = finalSlot()
  const pages = getFinalPages()
  const index = pickPageIndexForElapsed(pages, time - slot.startTime, slot.endTime - slot.startTime)
  return pages[index]!
}

/**
 * Page the closing bulletin the way its own view does: parse speaker
 * paragraphs, then hand them to `pickBlockPage`. This is the audience's view,
 * as opposed to `pageAt`, which is the scheduler's. The two must agree.
 */
function renderedPageAt(time: number) {
  const slot = finalSlot()
  const page = pickBlockPage(
    getFinalBlocks(),
    block => block.source,
    time - slot.startTime,
    slot.endTime - slot.startTime,
    rebuildLoreSpeakerParagraph,
  )
  return page.blocks.map(block => block.source).join('\n\n')
}

// The finale is the one moment in the show where music and text must agree:
// the audience reads that the doctor is dead on the same beat the score says
// Become Legend. Both sides are derived from TRACK_ZERO_SECTIONS.finaleStart,
// and these tests fail if either drifts off it.
describe('finale reveal', () => {
  it('turns up the death reveal exactly on the finale beat', () => {
    expect(pageAt(BEAT)).toContain('Dr. Andy Anderson')
  })

  it('lands the whole reveal as one page, not split across a page turn', () => {
    expect(pageAt(BEAT)).toBe(
      'following the tragic death of Dr. Andy Anderson and his team in a laboratory accident earlier this year.',
    )
  })

  it('still holds the setup a moment before the beat', () => {
    expect(pageAt(BEAT - 0.25)).not.toContain('Dr. Andy Anderson')
  })

  it('fires Become Legend on the same beat', () => {
    expect(getWolvesThesisState(BEAT).text).toBe('Become Legend')
    expect(getWolvesThesisState(BEAT - 0.25).text).not.toBe('Become Legend')
  })

  it('never ends a page on a dangling function word', () => {
    const trailing = /\s(?:a|an|the|and|or|of|to|in|on|at|by|for|from|with|is|was|will|that|his|her|their|its)$/i

    for (const record of loadAllLoreRecords()) {
      const pages = record.kind === 'chatlog' ? loreChatPages(record.body) : loreProsePages(record.body)
      pages.slice(0, -1).forEach((page, index) => {
        expect(trailing.test(page.trimEnd()), `${record.id} page ${index} ends mid phrase: "${page.slice(-40)}"`).toBe(false)
      })
    }
  })

  it('keeps the doctor title and name on one page', () => {
    const record = loadAllLoreRecords().find(entry => entry.id === FINAL_ID)!
    for (const page of loreProsePages(record.body)) {
      expect(page.trimEnd(), 'a page ends on a title, orphaning the name').not.toMatch(/\bDr\.$/)
    }
    expect(loreProsePages(record.body).some(page => page.includes('Dr. Andy Anderson'))).toBe(true)
  })

  it('gives the closing bulletin room for every authored page', () => {
    const slot = finalSlot()
    const record = loadAllLoreRecords().find(entry => entry.id === FINAL_ID)!
    const pages = loreProsePages(record.body)
    const last = pageAt(slot.endTime - 0.1)

    expect(last).toContain('truly a great loss for humanity')
    expect(last).toBe(pages[pages.length - 1])
  })

  // The scheduler derives the bulletin's start time from what it thinks the
  // pages cost, but the audience only ever sees what the view pages. When the
  // two models disagree the show still "works" and every count-based test
  // still passes -- the reveal simply arrives on the wrong beat. It once ran
  // 8.3 seconds ahead of Become Legend, and split "Dr. Andy Anderson" from
  // "and his team" across a page turn, because the view measured escaped HTML
  // with the "**MICHAEL**:" prefix stripped while the scheduler measured the
  // authored block. Both sides now measure the authored block.
  describe('the audience sees what the scheduler timed', () => {
    it('shows the reveal on the beat when paged the way the view pages it', () => {
      expect(renderedPageAt(BEAT)).toContain('Dr. Andy Anderson')
      expect(renderedPageAt(BEAT - 0.25)).not.toContain('Dr. Andy Anderson')
    })

    it('agrees with the scheduler on every page of the bulletin', () => {
      const slot = finalSlot()
      for (let time = slot.startTime; time < slot.endTime; time += 0.25) {
        expect(renderedPageAt(time), `bulletin disagrees at ${time.toFixed(2)}s`).toBe(pageAt(time))
      }
    })

    it('pages every speaker transcript the way the scheduler costs it', () => {
      for (const record of loadAllLoreRecords()) {
        if (record.kind !== 'news' && record.kind !== 'source') {
          continue
        }
        const rendered = pickBlockPage(
          parseLoreSpeakerParagraphs(record.body),
          block => block.source,
          0,
          undefined,
          rebuildLoreSpeakerParagraph,
        )
        expect(rendered.pageCount, `${record.id} pages differently than it is costed`)
          .toBe(loreProsePages(record.body).length)
      }
    })

    it('keeps the speaker on every page of a turn that spans pages', () => {
      const record = loadAllLoreRecords().find(entry => entry.id === FINAL_ID)!
      const blocks = parseLoreSpeakerParagraphs(record.body)
      const slot = finalSlot()
      const duration = slot.endTime - slot.startTime

      for (let elapsed = 0; elapsed < duration; elapsed += 0.5) {
        const page = pickBlockPage(blocks, b => b.source, elapsed, duration, rebuildLoreSpeakerParagraph)
        for (const block of page.blocks) {
          expect(block.speaker, `a page at +${elapsed.toFixed(1)}s has no speaker`).not.toBe('')
          expect(block.text, 'a rendered page still carries its authored speaker prefix')
            .not
            .toMatch(/^\*\*/)
        }
      }
    })
  })
  // The Director's Cut plays the same bulletin on its own window, and the
  // finale — not the lore column — is what renders it from the finale beat on.
  // The reveal therefore lands on a different second in that cut, and the only
  // thing that must never happen is the audience not seeing it at all.
  describe('the Director\'s Cut carries the same bulletin', () => {
    const directorSlot = wolvesDirectorsCutNarrativeTimeline.find(entry => entry.artifactId === FINAL_ID)!

    function directorPageAt(time: number) {
      const pages = getFinalPages()
      const index = pickPageIndexForElapsed(
        pages,
        time - directorSlot.startTime,
        directorSlot.endTime - directorSlot.startTime,
      )
      return pages[index]!
    }

    it('pages and clears the bulletin on its complete authored window', () => {
      // The finale takes the record over mid-run from the lore column. It must
      // keep the timeline slot's `(duration, elapsed)` pair so the handover
      // cannot re-page, and the complete slot ends before the impact reveal.
      expect(directorSlot.startTime).toBe(DIRECTORS_CUT_FINALE_ANCHORS.bulletinStart)
      expect(directorSlot.endTime).toBe(DIRECTORS_CUT_FINALE_ANCHORS.bulletinEnd)
      expect(DIRECTORS_CUT_FINALE_ANCHORS.bulletinEnd).toBeGreaterThan(DIRECTORS_CUT_FINALE_ANCHORS.coverStart)
      expect(DIRECTORS_CUT_FINALE_ANCHORS.bulletinEnd).toBeLessThan(DIRECTORS_CUT_FINALE_ANCHORS.companionReveal)
    })

    it('still shows the death reveal, inside the finale the audience is watching', () => {
      const revealTimes: number[] = []
      for (let time = directorSlot.startTime; time < directorSlot.endTime; time += 0.25) {
        if (directorPageAt(time).includes('Dr. Andy Anderson')) {
          revealTimes.push(time)
        }
      }
      expect(revealTimes.length, 'the Director\'s Cut never shows the death reveal').toBeGreaterThan(0)
      expect(revealTimes[0]!).toBeGreaterThan(DIRECTORS_CUT_FINALE_ANCHORS.coverStart)
      expect(revealTimes[revealTimes.length - 1]!).toBeLessThan(DIRECTORS_CUT_FINALE_ANCHORS.bulletinEnd)
    }, 30000)

    it('lands the elegy page, read in full, before the bulletin clears', () => {
      const pages = getFinalPages()
      const elegy = pages[pages.length - 1]!
      // The last frame the bulletin is on screen is also the last frame of its
      // complete paging window. The page must be the authored elegy, not a
      // truncated record dropped early to make room for the finale.
      expect(directorPageAt(DIRECTORS_CUT_FINALE_ANCHORS.bulletinEnd - 0.1)).toBe(elegy)
      expect(elegy).toContain('truly a great loss for humanity')

      // And it is not cut off mid-read: the elegy has been up for longer than
      // the reading time the pager itself charged for it before it is cleared.
      let elegyStart = directorSlot.endTime
      for (let time = directorSlot.startTime; time < directorSlot.endTime; time += 0.05) {
        if (directorPageAt(time) === elegy) {
          elegyStart = time
          break
        }
      }
      expect(DIRECTORS_CUT_FINALE_ANCHORS.bulletinEnd - elegyStart)
        .toBeGreaterThan(estimatePagesSeconds([elegy]))
      // It does not share the frame with the impact or closing quote either.
      expect(DIRECTORS_CUT_FINALE_ANCHORS.bulletinEnd)
        .toBeLessThan(DIRECTORS_CUT_FINALE_ANCHORS.extinctionStart)
      expect(DIRECTORS_CUT_FINALE_ANCHORS.bulletinEnd)
        .toBeLessThan(DIRECTORS_CUT_FINALE_ANCHORS.companionReveal)
    // Explicit timeout: this walks the whole director slot in 0.05s steps, paging the
    // record at every step, and CI runs the suite under v8 coverage instrumentation.
    // Uninstrumented that is ~0.6s; instrumented it is ~4s locally and reached 7.3s on a
    // CI runner, past the 5s default. The scan is the point of the test — it proves the
    // elegy is up for longer than its own reading cost — so give it room rather than
    // trading away what it checks.
    }, 30000)
  })
})
