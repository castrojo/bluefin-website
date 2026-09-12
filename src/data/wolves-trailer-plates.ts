/**
 * Trailer 1 — the owner's delivered cut, played directly.
 *
 * PROVENANCE: the teaser embeds the owner's own render of "Trailer 1.1"
 * (delivered 2026-08-22), whose authoritative record is the destiny-vids repo
 * at `stories/trailer-1-plates.json`, with the plate DESIGN authored in
 * `cards/maintitle.html`, `cards/bookline.html` and `cards/daycard.html` and
 * the composition in `scripts/build_trailer1.py`. The teaser used to recreate
 * this cut in the browser over a third-party music-video upload; it now plays
 * the delivered render, which has every plate, the bridge, and the end card
 * burned in. The records below remain the authored description of the cut —
 * they drive the heading yield, the opening black mask, and the URL card that
 * covers YouTube's endscreen — and every string is owner-authored copy
 * reproduced VERBATIM: do not reword, re-case, or "fix" any of it here;
 * change the source manifest and re-port instead.
 *
 * THE CUT IS THREE SEGMENTS, NOT ONE VIDEO WITH OVERLAYS. The delivered
 * trailer leaves the picture at 88.2 s and never returns to it.
 *
 *   0       -> 88.2    the picture
 *   88.2    -> 112.2   day falling into night
 *   112.2   -> 127.02  the night scene as a poster end card
 *
 * Both day cards and the whole end card sit on the scene at FULL frame, with
 * no letterbox — which is also why they carry no scrim: the owner had it
 * removed ("remove the black translucent box around the words") and the
 * contrast is carried by a halo on the glyphs instead.
 */

/**
 * The picture the teaser embeds: the owner's delivered 4K60 render of the
 * cut, "Wolves Trailer Final". NOT the destiny-vids ingest, and deliberately
 * left as it was found — the video is the owner's call, not this file's.
 *
 * # ponytail: still the pre-recut render. The 2:07 re-cut (destiny-vids#314)
 * has no YouTube master until the owner uploads it, so there is no correct
 * ID to port yet. Swap this to the new upload when it lands; everything above
 * in this file is already ported to that cut's timings.
 */
export const TRAILER_VIDEO_ID = 'u-ZWdKcHyXM'

/** The source music stops after the howl and its approved fade. (re-cut: 120.02) */
export const TRAILER_MUSIC_END_SECONDS = 120.02
/** The delivered picture holds the URL for seven silent seconds after the music. (re-cut: 127.02) */
export const TRAILER_DURATION_SECONDS = 127.02
/** Compatibility name for records that describe picture rather than transport. */
export const TRAILER_CUT_DURATION_SECONDS = TRAILER_DURATION_SECONDS

/**
 * Segment boundaries, from `scripts/build_trailer1.py`:
 * picture 88.200 + bridge 24.000 + end card 12.820 = 127.020.
 *
 * The bridge's five prologue legs were dropped (destiny-vids#314); the trailer
 * bridge is now three legs summing to 24.000. The end card's nominal 12.820 is
 * unchanged, so this boundary moves with the bridge: 88.2 + 24.0 = 112.2.
 */
export const TRAILER_PICTURE_END_SECONDS = 88.2
export const TRAILER_BRIDGE_END_SECONDS = 112.2
/** The source picture stays black until the explosion blooms out of it. */
export const TRAILER_PICTURE_REVEAL_SECONDS = 12.2
/** Two 59.94 fps frames, matching the delivered trailer's opening gate. */
export const TRAILER_PICTURE_REVEAL_FADE_SECONDS = 2 * 1001 / 60000

/** `BRIDGE_MONTH = 3` — the owner named `03-bluefin-day`. */
export const TRAILER_BRIDGE_MONTH = '03'

/**
 * The bridge's three legs, post re-cut (destiny-vids#314). They sum to 24.000,
 * and the leg names are the build's own: the wallpaper rises out of black and
 * settles as day, turns to night, then holds as night into the end card. The
 * old `up`/`dayHold`/`turn`/`nightHold`/`down` set was copied from the prologue
 * and never described this trailer's filtergraph.
 */
export const TRAILER_BRIDGE_LEGS = {
  daySettle: 4.0,
  turn: 10.0,
  nightTail: 10.0,
} as const

/** End card fades, relative to the end card's own start at 112.2. */
export const TRAILER_ENDCARD_EVENT_IN = 1.2
export const TRAILER_ENDCARD_EVENT_FADE = 1.1
export const TRAILER_ENDCARD_CTA_IN = 7.82
export const TRAILER_ENDCARD_CTA_FADE = 0.6
export const TRAILER_ENDCARD_FADE = 1.2
/** Freeze the completed teaser immediately before the URL card fades out. */
export const TRAILER_ENDCARD_HOLD_SECONDS = TRAILER_CUT_DURATION_SECONDS - TRAILER_ENDCARD_FADE

/**
 * The title plate stays up across both authored beats; the credit line joins
 * at the second beat (maintitle-b). The title must not move when it does, so
 * the credit row always occupies its space.
 */
export const TRAILER_CREDIT_JOIN_SECONDS = 12.2

/** Authored casing preserved: the card uppercases in CSS, as the film does. */
export const TRAILER_TITLE_LABEL = 'PROJECT BLUEFIN'
export const TRAILER_TITLE_LINE = 'seven days to the wolves'
export const TRAILER_CREDIT_LINE = 'Music by Nightwish | Action by Destiny'

/**
 * EVERY B AND EVERY F IS BLUE. Owner, 2026-08-15: "Ensure every b is blue, and
 * every f is blue in all the dialogue except the chat bubbles and nameplates."
 *
 * #4285f4 is NOT picked and is NOT `--wc-gold` (#60a5fa, a UI token). It is the
 * published fill of the fin ligature in Project Bluefin's own wordmark, so the
 * coloured letters here carry the same value the real mark's one coloured
 * element does.
 */
export const TRAILER_ACCENT_COLOR = '#4285f4'
export const TRAILER_BLUE_LETTERS = 'BbFf'

export interface TrailerPlate {
  id: string
  kind: 'maintitle' | 'bookline' | 'daycard' | 'endcard-event' | 'endcard-cta'
  /** Window in seconds of trailer time, [start, end). */
  start: number
  end: number
  title?: string
  subtitle?: string
  lines?: string[]
  tags?: string[]
  /**
   * Box centre in the 1920x1080 authoring frame, for plates the build walks
   * across the picture rather than centring.
   */
  anchor?: readonly [number, number]
  fadeIn?: number
  fadeOut?: number
}

export const TRAILER_PLATES: readonly TrailerPlate[] = [
  {
    id: 'maintitle',
    kind: 'maintitle',
    // maintitle-a 7.0+5.2 and maintitle-b 12.2+10.4 are one continuous title
    // presence in the cut; the credit line appears mid-way (see
    // TRAILER_CREDIT_JOIN_SECONDS).
    start: 7.0,
    end: 22.6,
    title: TRAILER_TITLE_LINE,
    lines: [TRAILER_CREDIT_LINE, 'Open Source Fights Back'],
    // TITLE_FADE = 1.400, and TITLE_OUT = 22.600 is this plate's own end.
    fadeIn: 1.4,
    fadeOut: 1.4,
  },
  {
    id: 'book-a',
    kind: 'bookline',
    start: 26.9,
    end: 33.64,
    anchor: [1030, 443],
    lines: [
      'Two Generations of Contributors',
      'One at their beginning',
      'One at their end',
      'These are their Real Stories',
    ],
  },
  {
    // Authored timing continuation with no visible pixels: the rendered
    // plate_book-b.png has an empty alpha channel. Keep the record for fidelity
    // to the source manifest, but never turn it into a collapsed empty box.
    id: 'book-b',
    kind: 'bookline',
    start: 31.0,
    end: 34.9,
    anchor: [1000, 470],
    lines: [],
  },
  {
    id: 'daycard-extinction',
    kind: 'daycard',
    start: 88.8,
    end: 93.8,
    title: 'Extinction is the Rule',
    fadeIn: 0.4,
    fadeOut: 0.5,
  },
  {
    id: 'daycard-survival',
    kind: 'daycard',
    start: 94.4,
    end: 100.6,
    title: 'Survival is the Exception',
    fadeIn: 0.5,
    fadeOut: 0.6,
  },
  {
    // Third dramatic line of the re-cut, at 101.2. No glyph: one Kubernetes
    // mark across the set, on daycard-extinction only. Ported verbatim from the
    // manifest, which gives this card no authored fade.
    id: 'daycard-takeback',
    kind: 'daycard',
    start: 101.2,
    end: 107.6,
    title: 'Take Back What is Yours',
  },
  {
    // Start is the build's ENDCARD_EVENT_IN (1.200 into the end card), which
    // is when the rows actually begin to arrive; the manifest's nominal `at`
    // is when the transparent PNG joins the graph.
    id: 'endcard-event',
    kind: 'endcard-event',
    start: TRAILER_BRIDGE_END_SECONDS + TRAILER_ENDCARD_EVENT_IN,
    end: TRAILER_CUT_DURATION_SECONDS,
    title: 'KubeCon | CloudNativeCon North America',
    subtitle: 'Salt Lake City, Utah',
    fadeIn: TRAILER_ENDCARD_EVENT_FADE,
    fadeOut: TRAILER_ENDCARD_FADE,
  },
  {
    // The CTA is a second card over the first: the event rows stay where they
    // are and the domain arrives at the music's returning swell.
    id: 'endcard-cta',
    kind: 'endcard-cta',
    start: TRAILER_BRIDGE_END_SECONDS + TRAILER_ENDCARD_CTA_IN,
    end: TRAILER_CUT_DURATION_SECONDS,
    title: 'wolves.projectbluefin.io',
    tags: ['#KubeCon', '#CloudNativeCon', '#7wolves'],
    fadeIn: TRAILER_ENDCARD_CTA_FADE,
    fadeOut: TRAILER_ENDCARD_FADE,
  },
] as const

/** The plates visible at a given trailer timestamp. */
export function activeTrailerPlates(timeSeconds: number): TrailerPlate[] {
  if (!Number.isFinite(timeSeconds)) {
    return []
  }
  return TRAILER_PLATES.filter(plate =>
    timeSeconds >= plate.start
    && timeSeconds < plate.end
    && !(plate.kind === 'bookline' && plate.lines?.length === 0),
  )
}

export type TrailerSegment = 'picture' | 'bridge' | 'endcard'

/** Black cover over the raw Nightwish picture before the authored burst. */
export function trailerOpeningBlackOpacity(timeSeconds: number): number {
  if (!Number.isFinite(timeSeconds) || timeSeconds <= TRAILER_PICTURE_REVEAL_SECONDS) {
    return 1
  }
  if (timeSeconds >= TRAILER_PICTURE_REVEAL_SECONDS + TRAILER_PICTURE_REVEAL_FADE_SECONDS) {
    return 0
  }
  return 1 - (
    timeSeconds - TRAILER_PICTURE_REVEAL_SECONDS
  ) / TRAILER_PICTURE_REVEAL_FADE_SECONDS
}

/** Which of the cut's three pictures is on screen at a given timestamp. */
export function trailerSegmentAt(timeSeconds: number): TrailerSegment {
  if (!Number.isFinite(timeSeconds) || timeSeconds < TRAILER_PICTURE_END_SECONDS) {
    return 'picture'
  }
  return timeSeconds < TRAILER_BRIDGE_END_SECONDS ? 'bridge' : 'endcard'
}

function ramp(value: number, from: number, to: number): number {
  if (to <= from) {
    return value >= to ? 1 : 0
  }
  return Math.max(0, Math.min(1, (value - from) / (to - from)))
}

export interface TrailerBridgeState {
  /** The wallpaper's own opacity over black, so the bridge opens and closes dark. */
  opacity: number
  /**
   * 0 is the day wallpaper, 1 the night one. Owner: "start the wallpaper at day
   * and then as it fades into dark bring in the text."
   */
  nightMix: number
}

/** Where the bridge's day-to-night walk has got to at a given timestamp. */
export function trailerBridgeState(timeSeconds: number): TrailerBridgeState {
  const { daySettle, turn, nightTail } = TRAILER_BRIDGE_LEGS
  const t = timeSeconds - TRAILER_PICTURE_END_SECONDS
  const turnStart = daySettle
  const turnEnd = turnStart + turn
  const fallStart = turnEnd + nightTail
  const span = TRAILER_BRIDGE_END_SECONDS - TRAILER_PICTURE_END_SECONDS
  return {
    opacity: Math.min(ramp(t, 0, daySettle), 1 - ramp(t, fallStart, span)),
    nightMix: ramp(t, turnStart, turnEnd),
  }
}

/** A plate's opacity, honouring its authored fade in/out. */
export function trailerPlateOpacity(plate: TrailerPlate, timeSeconds: number): number {
  if (timeSeconds < plate.start || timeSeconds >= plate.end) {
    return 0
  }
  const rising = plate.fadeIn ? Math.min(1, (timeSeconds - plate.start) / plate.fadeIn) : 1
  const falling = plate.fadeOut ? Math.min(1, (plate.end - timeSeconds) / plate.fadeOut) : 1
  return Math.max(0, Math.min(rising, falling))
}

/**
 * THE PAGE HEADING YIELDS TO THE PICTURE.
 *
 * The teaser page carries the film's name in an `h1` above the frame, and the
 * cut carries the same four words in its own main-title card at 7.0 s. Both
 * were on screen at once, so the title card revealed a title the audience had
 * already been reading for seconds — the reveal had nothing left to
 * reveal, and the page read as if it were stuttering.
 *
 * A theater darkens before the title hits. The heading is therefore fully down
 * BEFORE the card opens, rather than cross-fading with it: a dissolve would
 * still put two copies of the title on screen together, which is the defect.
 * It stays down for the rest of a running picture and returns once the picture
 * is not playing.
 *
 * The heading keeps its box either way; this is an opacity, never a `display`,
 * so the measured viewport budget that keeps the whole frame above the fold
 * does not move when it goes.
 */
export const TRAILER_HEADING_YIELD_SECONDS = 1.2

/**
 * The page heading's opacity at a given trailer time. Derived from the
 * main-title plate's own window, so re-porting the cut moves the heading with
 * the card instead of stranding a hand-copied beat here.
 *
 * `playing` keeps the heading out of the running picture after the card has
 * closed. Restoring it the instant the card ends would pop a full-width title
 * back in over a film still in progress — the same class of stutter this fix
 * exists to remove. It returns whenever the picture is not running (idle,
 * paused, ended), where it is page furniture again rather than competition.
 */
export function trailerHeadingOpacity(
  timeSeconds: number,
  options: { playing?: boolean } = {},
): number {
  if (!Number.isFinite(timeSeconds) || timeSeconds <= 0) {
    return 1
  }
  const maintitle = TRAILER_PLATES.find(plate => plate.id === 'maintitle')
  if (!maintitle) {
    return 1
  }
  const yieldStart = maintitle.start - TRAILER_HEADING_YIELD_SECONDS
  if (timeSeconds <= yieldStart) {
    return 1
  }
  if (timeSeconds >= maintitle.start) {
    // Down for the card itself, and for the rest of a running picture.
    return timeSeconds < maintitle.end || options.playing ? 0 : 1
  }
  return Math.max(0, 1 - (timeSeconds - yieldStart) / TRAILER_HEADING_YIELD_SECONDS)
}

/**
 * Split an authored string on its spaced pipes so the divider can be DRAWN as
 * a rule instead of set as a glyph. The copy is not edited: the same
 * characters are on screen, in the same order, and one of them is a rule.
 *
 * Only the spaced form ` | ` is a divider; a pipe inside a word is not.
 */
export function splitOnSear(text: string): string[] {
  return text.split(' | ')
}

export type TrailerToken
  = | { kind: 'text', value: string }
  /** One blue letterform. Changes no text — only the fill of a glyph. */
    | { kind: 'accent', value: string }
  /** The vertical glow standing in for a ` | `. */
    | { kind: 'sear' }
  /**
   * The Kubernetes helm standing in for one letter; `value` is that letter,
   *  which stays the image's alt text so the word is still read as written.
   */
    | { kind: 'mark', value: string }

interface TokenizeOptions {
  /** Apply the every-B-and-F rule. Off for other people's trademarks. */
  blue?: boolean
  /** Replace the single `o` of this word with the helm. */
  markWord?: string
  /** Accent every `.` instead of every B/F — the end card CTA's treatment. */
  accentDots?: boolean
}

function pushAccented(out: TrailerToken[], text: string, options: TokenizeOptions) {
  const accentable = options.accentDots
    ? '.'
    : (options.blue === false ? '' : TRAILER_BLUE_LETTERS)
  let run = ''
  for (const ch of text) {
    if (accentable.includes(ch)) {
      if (run) {
        out.push({ kind: 'text', value: run })
        run = ''
      }
      out.push({ kind: 'accent', value: ch })
    }
    else {
      run += ch
    }
  }
  if (run) {
    out.push({ kind: 'text', value: run })
  }
}

/**
 * Turn one authored line into the tokens the card draws.
 *
 * Nothing here edits copy. A sear replaces how a pipe is DRAWN, an accent
 * changes the fill of a letterform, and the mark swaps a glyph for an image
 * that carries the letter as its alt text.
 */
export function tokenizeTrailerLine(text: string, options: TokenizeOptions = {}): TrailerToken[] {
  const out: TrailerToken[] = []
  splitOnSear(text).forEach((part, index) => {
    if (index > 0) {
      out.push({ kind: 'sear' })
    }
    const word = options.markWord
    const at = word ? part.toLowerCase().lastIndexOf(word.toLowerCase()) : -1
    if (word && at !== -1) {
      const within = part.slice(at, at + word.length).toLowerCase().indexOf('o')
      if (within !== -1) {
        const letterAt = at + within
        pushAccented(out, part.slice(0, letterAt), options)
        out.push({ kind: 'mark', value: part[letterAt] })
        pushAccented(out, part.slice(letterAt + 1), options)
        return
      }
    }
    pushAccented(out, part, options)
  })
  return out
}
