# Wolves lore display and timeline timing

Repository boundary: [`../../AGENTS.md`](../../AGENTS.md).

Defect-derived invariants for the Wolves lore column: one page model, one type
scale, how the timeline budget is allocated, and how anchored text is bound to
measured beats in the music.

Procedure and approval gate: [`../skills/wolves-runtime-engineering/SKILL.md`](../skills/wolves-runtime-engineering/SKILL.md).
Show-wide production facts: [`wolves-runtime.md`](wolves-runtime.md).

Numbering in this file: "Track 0" is the comic reader's `trackIndex` 0 —
"7 Days to the Wolves", segment index 0. `wolves-runtime.md` uses show
numbering, where Track 0 is the Destiny intro; see
[`wolves-transport-and-clocks.md`](wolves-transport-and-clocks.md).

## Lore display model

The Wolves lore column is a theater text display, not a document. One panel,
one shared header, one page model, one type scale, no scrolling.

- `src/components/wolves/lore/lore-pages.ts` is the single page model. Both the
  scheduler (`src/data/wolves-lore-timing.ts`) and every lore view cost content
  with it. One model is not enough on its own: both sides must also feed it the
  same *authored* string. Never add a second splitter, a per-view character
  constant, or paginate rendered HTML.
- `src/components/wolves/lore/lore-dossier.scss` owns the only panel and the
  only type scale. Sizes are container-relative (`cqi` against
  `.lore-dossier-panel`, which sets `container-type: inline-size`) so type and
  spacing track the panel the theater layout hands the column, not the viewport.
  No view may hardcode a body `font-size`; consume `--lore-body-size`,
  `--lore-title-size`, `--lore-meta-size`, `--lore-gap`. The site sets
  `html { font-size: 63.5% }`, so `1rem` is about `10.16px`: a rem value copied
  from a normal 16px-root design reads roughly 1.6x too small here — a
  `clamp(1.15rem, …)` body size renders at about `12px`, far too small for
  theater seats. Size lore type by measuring `getComputedStyle(el).fontSize` in
  Chromium, not by reading the clamp.
- Every view renders `LoreRecordHeader.vue`: fixed uppercase kind eyebrow,
  record title, and one inline spec row of at most three key/value pairs. The
  Guardian and Dinosaur dossiers intentionally add one boxed metadata block
  (`lore-spec--boxed`) beneath that shared header — aliases, titles, the bond
  id, a derived status line — which is part of the design, not drift. Beyond
  that block there are no footers and no per-view chrome: anything further is
  noise on a theater screen.
- Page budgets must include per-block chrome. `BLOCK_OVERHEAD_CHARACTERS`
  charges each block for its speaker label and block gap; without it a page of
  short speaker blocks renders far taller than its character count predicts.
- Any block longer than a page is split before packing. A page that cannot be
  split is a page that clips. Renderers self-limit with `affordablePageCount()`:
  a slot never shows a page it cannot hold for that page's reading cost, so no
  page flashes past.

## Timeline oversubscription math

The song has 425 seconds. Both locked anchors derive their start from a
measured beat: `lorem-pursuit-1` from `bridgeStart` and
`blue-universal-acquires-wayland-yutani` from `finaleStart`. See "Anchoring
text to the music" below — neither start is a round number.

- Allocation is per whole page: a record's floor is one complete held page, its
  ideal is every authored page held for its reading cost. `allocateLoreSlots()`
  never allocates below the floor.
- **The floor is what makes oversubscription invisible.** When 27 records
  competed for ~400 seconds against ~900 seconds of authored pages, nothing
  errored. Every record was floored at one page, so a record with eight
  authored pages rendered page one and vanished. 19 of 27 records were cut
  mid-record, including Sarah's closing line and the death of Dr. Anderson.
  A record that is cut looks exactly like a record that is short. No renderer
  change can fix that: cutting records or extending the range is a human
  decision. Do not "solve" it by shrinking pages below a readable hold.
- **Curate by dropping the worst-served record, then re-solve.** Hiding
  cascades: freeing a slot lets survivors expand, so the fix is not "hide every
  record currently cut". Greedily drop the record showing the smallest fraction
  of itself (tie-break on largest ideal duration) and recompute until every
  survivor shows 100%. That took 19 cut records down to 11 hidden.
- Hidden records live in `hiddenFromWolvesVideoArtifactIds`. Hiding is
  reversible and lossless; a fragment on screen is neither. **Audit with a probe,
  not by eye:** compare each slot's duration against `affordablePageCount()`
  versus the record's authored page count. Anything below 100% is a record the
  audience sees the beginning of and nothing else.

## Timing lessons

- Keep scheduler and renderer on one content-cost timing model, and treat Wolves
  lore as a self-paced video presentation, not an interactive document: the
  renderer must advance and hold readable content automatically. Never *depend*
  on pointer, click, touch, keyboard, or scrolling interaction, and never expose
  a scrollbar. The audience has no input device. A presenter-only affordance on a
  silent pre-show card is the single exception — see "A presenter may pace a
  silent card" in
  [`wolves-intro-and-overlay.md`](wolves-intro-and-overlay.md).
- Render chatlogs and quotes as noninteractive, sentence- or word-bounded pages:
  one readable beat at a time, speaker header retained on continued chat beats,
  held and then replaced, never accumulated behind an overflow viewport.
- **Every lore view is a pure function of `elapsed`.** Chat and prose share one
  clock-driven page model: `pickPageIndexForElapsed(pages, elapsed, duration)`.
  No view owns a timer. The chat view used to be a typewriter on a `setInterval`
  started at mount that never read `props.elapsed`, which drifted against the
  music, could not be seeked or rehearsed from a fixed point, and held its slot
  open past the end so every later record started late. A view that reads the
  clock is reproducible: same second, same frame, every rehearsal.
- The Track 0 finale barrage begins at the measured 5:55 pickup
  (`TRACK_ZERO_SECTIONS.bkEnd`); spread its curated photos across the following
  measured beats rather than cutting on every beat.
- Add a locked hero photo as a contiguous timed window and shift only the
  following unlocked window: preserve locked anchors, recompute unlocked ones.
- Prefer invariant tests over stale exact timestamps for recomputed intervals.
  A build is not runtime proof; verify the real route in Chromium at short and
  long records and at locked anchors.

## Re-deriving Track 0 timing

Re-derive the unified Track 0 queue and finale timing from source with
`npm run test:run -- src/tests/wolvesThesisSequence.test.ts`.

## Anchoring text to the music

Some moments must land on a measured beat, not near one. There are two:

- The finale: the audience must read that Dr. Andy Anderson is dead on the same
  beat the score says **Become Legend** (`finaleStart`, 408.137).
- The Golden Era transmission: Sarah's closing line, "Thus becoming One, from
  the Seven...", lands on the chanting bridge (`bridgeStart`, 229.204).

The rule is **the text moves to the music, never the music to the text.**
`TRACK_ZERO_SECTIONS` in `src/data/wolves-track-zero-beats.ts` holds measured
beat times. A round number like `408` is an authored guess; a measured beat is
ground truth. Do not write down the start time you happened to measure — derive
it:

```ts
// wolves-narrative-timeline.ts
const finalRecordStartTime = TRACK_ZERO_SECTIONS.finaleStart
  - REVEAL_LEAD_SECONDS
  - costOfPagesBeforeTheReveal
```

`REVEAL_LEAD_SECONDS` (0.01) is not superstition: `pickPageIndexForElapsed`
selects with a strict `<`, so a page timed to the exact beat wins or loses on
float rounding — the first attempt showed the *previous* page on the beat.

Both anchors are also end-anchored, not just start-anchored: an anchored record
must get a slot at least as long as its authored pages cost. The Golden Era
transmission was once pinned to a hard-coded 150-220 — 19 seconds short of its
own content — so it was cut at page 8 of 11 and Sarah's line never reached the
screen. Anchor the *last* page to a beat and size the slot from the record's own
read cost, and both ends are fixed at once. Both sides of a synchronised moment
must read the same constant: the thesis cue uses `TRACK_ZERO_SECTIONS.finaleStart`
too, so the caption and the reveal cannot drift apart.
`src/tests/wolvesFinaleReveal.test.ts` asserts the page shown at the beat, the
page just before it, and the cue text; `wolvesLoreColumn.test.ts` does the same
for Sarah against `bridgeStart`, using the real scheduled slot.

An anchor derived from page costs is only as good as the string those costs are
measured from. The scheduler costs authored blocks (`loreProsePages`), so a view
must page the *same* authored blocks. `parseLoreSpeakerParagraphs` returns
`source` — the authored block with its `**SPEAKER**:` prefix intact — for
`pickBlockPage` to measure, plus separate `speaker`/`text` fields for display.
Paginating rendered HTML instead is silently wrong: escaping, `<strong>`
expansion, and a stripped speaker prefix each change the character count, so a
long turn breaks at a different word than the scheduler predicted. Page *counts*
usually still match, so count-based tests pass while the reveal drifts. That is
how the closing bulletin showed "Dr. Andy Anderson" 8.3 seconds before **Become
Legend**, with the reveal clause dealt across a page turn. A test that pages a
record must page it through the view's path, not the scheduler's. When you change
an anchor, expect tests asserting the old round number to fail: rebind them to
the measured constant; do not re-record them as known failures.

See `../skills/wolves-content/SKILL.md` for page-breaking, image fitting, projected
measure, and gallery-withholding rules.
