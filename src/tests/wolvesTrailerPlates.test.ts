import type { TrailerToken } from '@/data/wolves-trailer-plates'
import { describe, expect, it } from 'vitest'
import {
  activeTrailerPlates,
  tokenizeTrailerLine,
  TRAILER_BRIDGE_END_SECONDS,
  TRAILER_BRIDGE_LEGS,
  TRAILER_CREDIT_JOIN_SECONDS,
  TRAILER_CREDIT_LINE,
  TRAILER_CUT_DURATION_SECONDS,
  TRAILER_DURATION_SECONDS,
  TRAILER_ENDCARD_HOLD_SECONDS,
  TRAILER_HEADING_YIELD_SECONDS,
  TRAILER_MUSIC_END_SECONDS,
  TRAILER_PICTURE_END_SECONDS,
  TRAILER_PICTURE_REVEAL_FADE_SECONDS,
  TRAILER_PICTURE_REVEAL_SECONDS,
  TRAILER_PLATES,
  TRAILER_TITLE_LABEL,
  TRAILER_VIDEO_ID,
  trailerBridgeState,
  trailerHeadingOpacity,
  trailerOpeningBlackOpacity,
  trailerPlateOpacity,
  trailerSegmentAt,
} from '@/data/wolves-trailer-plates'

// These windows are the owner's cut (destiny-vids stories/trailer-1-plates.json
// and scripts/build_trailer1.py, "Trailer 1.1", 2026-08-18). If the cut is
// recut, re-port the manifest — do not nudge these numbers to make a test pass.
describe('wolves trailer plates', () => {
  it('holds the music to 2:00.020 and the cut to 2:07.020', () => {
    // The video ID is blocked on the owner's re-cut upload (issue #758); the
    // render currently embedded is unchanged. Do not port a new ID until it lands.
    expect(TRAILER_VIDEO_ID).toBe('u-ZWdKcHyXM')
    expect(TRAILER_MUSIC_END_SECONDS).toBe(120.02)
    expect(TRAILER_DURATION_SECONDS).toBe(127.02)
    expect(TRAILER_CUT_DURATION_SECONDS).toBe(TRAILER_DURATION_SECONDS)
  })

  it('shows nothing before the main title and after the cut ends', () => {
    expect(activeTrailerPlates(0)).toEqual([])
    expect(activeTrailerPlates(6.9)).toEqual([])
    // Held from the music's swell; probe just past it to dodge 112.2+7.82 float noise.
    expect(activeTrailerPlates(TRAILER_MUSIC_END_SECONDS + 0.01).map(p => p.id)).toEqual(['endcard-event', 'endcard-cta'])
    expect(activeTrailerPlates(TRAILER_DURATION_SECONDS)).toEqual([])
    expect(activeTrailerPlates(Number.NaN)).toEqual([])
  })

  it('holds the main title across both authored beats', () => {
    expect(activeTrailerPlates(7).map(p => p.id)).toEqual(['maintitle'])
    expect(activeTrailerPlates(TRAILER_CREDIT_JOIN_SECONDS).map(p => p.id)).toEqual(['maintitle'])
    expect(activeTrailerPlates(22.6).map(p => p.id)).toEqual([])
  })

  // The page heading and the film's own title card say the same four words.
  // Two surfaces spelling the title at once is what broke the reveal: the
  // audience had already read the words for eleven seconds before the picture
  // said them. The heading yields, and it is fully down before the card opens.
  it('takes the page heading down before the film says its own name', () => {
    const titleStart = TRAILER_PLATES.find(p => p.id === 'maintitle')!.start

    expect(trailerHeadingOpacity(0)).toBe(1)
    expect(trailerHeadingOpacity(titleStart - TRAILER_HEADING_YIELD_SECONDS)).toBe(1)
    expect(trailerHeadingOpacity(titleStart)).toBe(0)
  })

  it('never lets the heading and the title card both carry the title', () => {
    const maintitle = TRAILER_PLATES.find(p => p.id === 'maintitle')!

    for (let t = 0; t <= TRAILER_DURATION_SECONDS; t += 0.1) {
      const seconds = Number(t.toFixed(1))
      const card = activeTrailerPlates(seconds).some(p => p.id === 'maintitle')
        ? trailerPlateOpacity(maintitle, seconds)
        : 0

      for (const playing of [false, true]) {
        const heading = trailerHeadingOpacity(seconds, { playing })
        expect(Math.min(card, heading), `both titles legible at ${seconds}s (playing=${playing})`).toBe(0)
      }
    }
  })

  it('keeps the heading down for the card and for the running picture', () => {
    expect(trailerHeadingOpacity(TRAILER_CREDIT_JOIN_SECONDS)).toBe(0)
    expect(trailerHeadingOpacity(30, { playing: true })).toBe(0)
    expect(trailerHeadingOpacity(TRAILER_ENDCARD_HOLD_SECONDS, { playing: true })).toBe(0)
  })

  // Returning it the instant the card closes would pop a full-width title back
  // in over a film still running; it returns only when nothing is playing.
  it('gives the heading back once the picture is not running', () => {
    expect(trailerHeadingOpacity(30)).toBe(1)
    expect(trailerHeadingOpacity(TRAILER_ENDCARD_HOLD_SECONDS)).toBe(1)
  })

  // An unstarted clock must leave the page titled; a NaN one must not blank it.
  it('leaves the heading up when the trailer has not started', () => {
    expect(trailerHeadingOpacity(Number.NaN)).toBe(1)
    expect(trailerHeadingOpacity(-5)).toBe(1)
  })

  it('shows the four-line book box over the book shot', () => {
    const [book] = activeTrailerPlates(27)
    expect(book?.id).toBe('book-a')
    expect(book?.lines).toEqual([
      'Two Generations of Contributors',
      'One at their beginning',
      'One at their end',
      'These are their Real Stories',
    ])
  })

  // The second source record has no alpha pixels. It remains in the manifest
  // but is not an active visible plate and must never collapse to a tiny box.
  it('does not render the transparent book timing continuation', () => {
    expect(activeTrailerPlates(32).map(p => p.id)).toEqual(['book-a'])
    expect(activeTrailerPlates(34)).toEqual([])
    expect(TRAILER_PLATES.find(p => p.id === 'book-b')?.lines).toEqual([])
  })

  it('preserves both source anchors in the authoring record', () => {
    expect(TRAILER_PLATES.find(p => p.id === 'book-a')?.anchor).toEqual([1030, 443])
    expect(TRAILER_PLATES.find(p => p.id === 'book-b')?.anchor).toEqual([1000, 470])
  })

  it('runs the marquee messages in the wolves fade', () => {
    expect(activeTrailerPlates(89).map(p => p.id)).toEqual(['daycard-extinction'])
    expect(activeTrailerPlates(95).map(p => p.id)).toEqual(['daycard-survival'])
    expect(activeTrailerPlates(104).map(p => p.id)).toEqual(['daycard-takeback'])
  })

  // The call to action is a second card OVER the event rows. In the re-cut it
  // is held out until the music stops, then holds with the event card to the
  // last frame of the cut.
  it('holds the KubeCon end card, then holds the call to action until the music stops', () => {
    // The event card is up while the URL is still held out...
    expect(activeTrailerPlates(115).map(p => p.id)).toEqual(['endcard-event'])
    expect(activeTrailerPlates(119).map(p => p.id)).toEqual(['endcard-event'])
    // ...until the music's swell, then holds with the event card to the last frame.
    expect(activeTrailerPlates(TRAILER_MUSIC_END_SECONDS + 0.01).map(p => p.id)).toEqual(['endcard-event', 'endcard-cta'])
    expect(activeTrailerPlates(TRAILER_DURATION_SECONDS - 0.01).map(p => p.id)).toEqual(['endcard-event', 'endcard-cta'])
  })

  it('holds the finished teaser where the URL card is fully visible', () => {
    const plates = activeTrailerPlates(TRAILER_ENDCARD_HOLD_SECONDS)
    expect(plates.map(plate => plate.id)).toEqual(['endcard-event', 'endcard-cta'])
    expect(plates.every(plate => trailerPlateOpacity(plate, TRAILER_ENDCARD_HOLD_SECONDS) === 1)).toBe(true)
  })
})

// The cut is three concatenated pictures, not one video with overlays. The
// first recreation missed this and drew the last 21.8 s over the music video.
describe('wolves trailer segments', () => {
  it('holds the opening black until the authored explosion bloom', () => {
    expect(TRAILER_PICTURE_REVEAL_SECONDS).toBe(12.2)
    expect(trailerOpeningBlackOpacity(0)).toBe(1)
    expect(trailerOpeningBlackOpacity(TRAILER_PICTURE_REVEAL_SECONDS)).toBe(1)
    expect(trailerOpeningBlackOpacity(
      TRAILER_PICTURE_REVEAL_SECONDS + TRAILER_PICTURE_REVEAL_FADE_SECONDS / 2,
    )).toBeCloseTo(0.5, 5)
    expect(trailerOpeningBlackOpacity(
      TRAILER_PICTURE_REVEAL_SECONDS + TRAILER_PICTURE_REVEAL_FADE_SECONDS,
    )).toBe(0)
  })

  it('leaves the music video at 88.2 and never returns to it', () => {
    expect(trailerSegmentAt(0)).toBe('picture')
    expect(trailerSegmentAt(88.19)).toBe('picture')
    expect(trailerSegmentAt(TRAILER_PICTURE_END_SECONDS)).toBe('bridge')
    expect(trailerSegmentAt(102.19)).toBe('bridge')
    expect(trailerSegmentAt(TRAILER_BRIDGE_END_SECONDS)).toBe('endcard')
    expect(trailerSegmentAt(TRAILER_DURATION_SECONDS)).toBe('endcard')
  })

  it('opens and closes the bridge on black', () => {
    expect(trailerBridgeState(TRAILER_PICTURE_END_SECONDS).opacity).toBe(0)
    expect(trailerBridgeState(88.2 + TRAILER_BRIDGE_LEGS.daySettle).opacity).toBe(1)
    expect(trailerBridgeState(TRAILER_BRIDGE_END_SECONDS).opacity).toBe(0)
  })

  it('turns the wallpaper from day to night across the authored leg', () => {
    const { daySettle, turn } = TRAILER_BRIDGE_LEGS
    const turnStart = TRAILER_PICTURE_END_SECONDS + daySettle
    expect(trailerBridgeState(turnStart).nightMix).toBeCloseTo(0, 10)
    expect(trailerBridgeState(turnStart + turn / 2).nightMix).toBeCloseTo(0.5, 5)
    expect(trailerBridgeState(turnStart + turn).nightMix).toBe(1)
    // The end card is the night image outright.
    expect(trailerBridgeState(TRAILER_BRIDGE_END_SECONDS).nightMix).toBe(1)
  })

  it('the bridge legs sum to the authored 24 seconds', () => {
    const total = Object.values(TRAILER_BRIDGE_LEGS).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(TRAILER_BRIDGE_END_SECONDS - TRAILER_PICTURE_END_SECONDS, 5)
  })
})

describe('trailer plate fades', () => {
  it('honours a day card\'s authored fade in and out', () => {
    const card = TRAILER_PLATES.find(p => p.id === 'daycard-extinction')!
    expect(trailerPlateOpacity(card, 88.7)).toBe(0)
    expect(trailerPlateOpacity(card, card.start)).toBe(0)
    expect(trailerPlateOpacity(card, card.start + card.fadeIn! / 2)).toBeCloseTo(0.5, 5)
    expect(trailerPlateOpacity(card, 91)).toBe(1)
    expect(trailerPlateOpacity(card, card.end - card.fadeOut! / 2)).toBeCloseTo(0.5, 5)
    expect(trailerPlateOpacity(card, card.end)).toBe(0)
  })
})

// None of these edit copy. They change how a glyph is PAINTED.
describe('trailer line treatments', () => {
  /** The characters actually on screen, so a treatment can be proved lossless. */
  function plain(tokens: TrailerToken[]): string {
    return tokens.map(token => (token.kind === 'sear' ? '' : token.value)).join('')
  }

  function valuesOf(tokens: TrailerToken[], kind: TrailerToken['kind']): string[] {
    return tokens.flatMap(token => (
      token.kind === kind && token.kind !== 'sear' ? [token.value] : []
    ))
  }

  it('colours every B and every F, and nothing else', () => {
    const tokens = tokenizeTrailerLine(TRAILER_TITLE_LABEL)
    expect(valuesOf(tokens, 'accent')).toEqual(['B', 'F'])
    expect(plain(tokens)).toBe(TRAILER_TITLE_LABEL)
  })

  it('colours lower-case b and f too', () => {
    const tokens = tokenizeTrailerLine(TRAILER_CREDIT_LINE)
    expect(valuesOf(tokens, 'accent')).toEqual(['b', 'b'])
  })

  it('draws a spaced pipe as a sear and keeps the words either side', () => {
    const tokens = tokenizeTrailerLine(TRAILER_CREDIT_LINE)
    expect(tokens.filter(t => t.kind === 'sear')).toHaveLength(1)
    expect(plain(tokens)).toBe(TRAILER_CREDIT_LINE.replace(' | ', ''))
  })

  it('leaves a pipe inside a word alone', () => {
    expect(tokenizeTrailerLine('a|b').filter(t => t.kind === 'sear')).toHaveLength(0)
  })

  it('does not recolour someone else\'s trademark', () => {
    const tokens = tokenizeTrailerLine('KubeCon | CloudNativeCon North America', { blue: false })
    expect(tokens.filter(t => t.kind === 'accent')).toHaveLength(0)
    expect(tokens.filter(t => t.kind === 'sear')).toHaveLength(1)
  })

  it('swaps only the o of the named word for the helm, keeping it as alt text', () => {
    const tokens = tokenizeTrailerLine('seven days to the wolves', { markWord: 'wolves' })
    const marks = valuesOf(tokens, 'mark')
    expect(marks).toHaveLength(1)
    // "to" also has an o; the instruction named one word.
    expect(marks[0]).toBe('o')
    expect(plain(tokens)).toBe('seven days to the wolves')
  })

  it('puts the helm on the O of Extinction', () => {
    const tokens = tokenizeTrailerLine('Extinction is the Rule', { markWord: 'Extinction' })
    expect(tokens.filter(t => t.kind === 'mark')).toHaveLength(1)
    expect(plain(tokens)).toBe('Extinction is the Rule')
  })

  it('sears the URL\'s dots and keeps its b and f white', () => {
    const tokens = tokenizeTrailerLine('wolves.projectbluefin.io', { accentDots: true })
    expect(valuesOf(tokens, 'accent')).toEqual(['.', '.'])
    expect(plain(tokens)).toBe('wolves.projectbluefin.io')
  })
})
