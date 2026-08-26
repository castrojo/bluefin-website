# Projection typography

How Wolves text is paged, measured, and fitted so the back row can read it. Loaded from the `wolves-content` skill when a change affects how words are set on screen.

Back to [`../SKILL.md`](../SKILL.md).

## Pages break at thoughts, not at character counts

`splitReadableBeats()` splits on sentence punctuation and then on a character
budget. Left alone, that budget breaks wherever the count runs out — after
`Dr.`, or on a stranded preposition. Both happened in the closing bulletin and
between them they cut the show's central reveal into pieces.

`readable-beats.ts` guards this in three stages:

- `mergeAbbreviationSplits()` rejoins sentences split at a title's period.
- `fuseTitledNames()` fuses a title with the capitalised words after it into one
  unbreakable token, so "Dr. Andy Anderson" is laid out as a single unit.
- `settleBreaks()` repairs a page that ends on a dangling function word by
  moving the whole trailing phrase to the next page. It only touches pages that
  end badly; a page ending on a complete thought is already a good page.

The measurable target: **no page ends on a dangling function word.** At the time
of writing that holds for all 347 pages across the registered records.

When touching this file, verify no page overflows its budget afterwards. A fuse
that is too greedy silently produces pages too tall to read from the back row:

```bash
npx vite-node <probe that pages every record and compares against
PROSE_PAGE_CHARACTERS / CHAT_PAGE_CHARACTERS>
```

At the time of writing: 347 pages, zero over budget, zero ending on a dangling
word, worst page 150 characters against a 190 budget. Derivation: page every
record returned by `loadAllLoreRecords()` through `loreProsePages()` (or
`loreChatPages()` for chatlogs) and count; do not re-type the number without
re-running the count.

`src/tests/wolvesFinaleReveal.test.ts` asserts the dangling-word rule across
every record, so a greedy change to the splitter fails immediately.

## A photo that is the slide needs different fitting than a backdrop

`.wolves-intro-overlay-background` sets `object-fit: cover`. That is right for a
backdrop and wrong when the photo is the subject. Cover scales the image to fill
the frame and throws away whatever overflows, so a 3:2 stage photo in a 16:9
frame loses its top and bottom, which is exactly where a speaker's gesture and
headroom live.

`contain` fixes landscape but destroys portrait: in a tall phone viewport the
same photo shrinks to a stamp floating in black. Scope it:

- Default (portrait) keeps `cover` with `object-position` biased up the frame, so
  the crop lands on the subject rather than the ceiling.
- `@media (min-aspect-ratio: 4 / 3)` switches to `contain`. That is the projector
  case, and the pillarbox reads as intentional letterboxing on a dark stage.

Check both orientations. A landscape screenshot cannot show you the portrait
failure, and the portrait failure is the ugly one.

## Projected body copy is capped by measure, not by container width

The plate is as wide as the frame allows, but the text must not be. At `68rem`
of container the title card body ran to roughly 90 characters per line; an
audience tracks about 50 to 75. Cap the paragraph itself with `max-width` in
`ch` and centre it with `margin: 0 auto`, leaving the panel free to stay wide.

Add `text-wrap: balance` to the paragraph. Without it the last line collapses to
a one-word orphan, which is the most distracting artefact in projected text.

`balance` has a trap: Chromium applies it only to blocks of **six lines or
fewer** and silently falls back to normal wrapping above that. It costs nothing
and warns about nothing, so a beat that grows past six lines loses the balancing
without any visible signal in the source. If a paragraph outgrows that budget,
either split it into another beat or switch that rule to `text-wrap: pretty`,
which has no line cap but only tidies the last few lines.

Measure the result in the browser rather than trusting the CSS: divide
`getBoundingClientRect().height` by the computed `line-height` for the line
count, then divide the character count by that. Assert both the count and the
resulting characters-per-line for every beat at both orientations.

## Counting rendered lines: three traps that all read as green

The prologue narration authors its own line breaks and `white-space: pre-line`
keeps them, but a line wider than the box still wraps — and Chromium breaks it
mid-phrase, which is the exact defect the lining exists to prevent. So the
invariant worth guarding is **rendered line boxes == authored line boxes**, per
cue, in a browser. `tests/wolves-directors-cut-prologue.mjs` holds it. Getting
there cost three false greens, all of which look identical to a passing run:

1. **Do not range over an element that has block children.** `Range.getClientRects()`
   emits a rect for each block child's *box* — always the full container width —
   on top of one rect per text line. The two-line closing title card therefore
   counted four rows at a flat 1152px in a 1152px box and was written up as
   catastrophically wrapped, in a handoff, as the last thing the audience sees.
   A screenshot showed it setting cleanly on two lines. Recurse into block
   children and only range over the leaves that actually hold text.
2. **Do not read the authored count back out of the DOM.** `slim` cues render
   their authored lines as sibling `<span>`s with no newline character, so
   `textContent.split('\n')` calls them one authored line and the check can
   never fail on the one cue most likely to break. Authored shape is a property
   of the cue; take it from `cue.text`.
3. **Do not filter the cue list by `textHoldSeconds != null`.** A cue that holds
   its shot to the end of the track has no hold, and the closing title card is
   one — so the final frame of the show was the one frame the check skipped.

A fourth trap sits in the settle, not the count: `seekPrologue()` settles on the
**image**, while the caption is separately keyed with its own 1.6s reveal. Sample
on an image settle and you measure the *previous* thought. The tell is that every
cue reports an identical width — 1111px, in the run that caught it. Wait on the
caption's own text before measuring.

Two render paths live under `.wolves-intro-overlay-text`: narration emits one
`<span>` per character, `slim` emits one block `<span>` per line. Anything that
walks children must separate on `display: block`, or it either spells the line
out letter by letter or welds "BLUEFIN" onto "seven".

**A new guard is not a guard until it has been red.** Both times, the proof was
to deliberately reintroduce the defect — restore an over-long line, or push the
crescendo from `4vw` to `6vw` — watch the assertion fail, then revert.

## `vw` beats `rem` when the type has to grow with the frame

Every Wolves caption is capped: `clamp(2.4rem, 4.6vw, 4.4rem)` pins narration to
~45px on *any* screen, because `4.6vw` passes the `4.4rem` ceiling at 970px wide.
On the 1920 projector the show is actually performed on, a `rem`-capped cue is no
bigger than it is on a laptop.

That is why the prologue crescendo carries its own rule sized in `vw`
(`clamp(2.6rem, 4vw, 7.5rem)`): it renders ~51px at 1280 and ~77px at 1920, where
it is 71% larger than everything around it. It also means the fit is proportional
to the box, so measuring it once establishes it at every width, instead of being
true only at the width it was measured at.

Note the root: `1rem` is **10.16px** here, not 16px. Every `rem` in these clamps
is worth about 63% of what it looks like, which is why `8rem` reads as "huge" and
renders as 81px.

Scope a variant like this to its own surface
(`.wolves-intro-overlay-text-director.wolves-intro-overlay-text-dominant`), and
place it **above** the `@media (max-width: 640px)` block. That block carries a
rule of exactly the same specificity; media queries add none, so CSS breaks the
tie on source order and a variant written after it silently undoes the phone
treatment.

## An overlay panel can hold contrast without painting a box

A solid `background-color` plus a border plus a drop shadow reads as a lit UI
box sitting on top of the picture. To recede while staying legible, replace the
flat fill with a `radial-gradient` that falls off toward the panel edges, drop
the border and the shadow to `0`/`none`, and raise `backdrop-filter: blur()`.
Contrast then comes from the blur and the existing `text-shadow` instead of from
an opaque rectangle.

## Allocating readability inside a locked range

- Fast music or slideshow slots must not accelerate ordinary chat typing; keep
  explicitly approved dialogue cadence anchors unchanged.
- For a locked chat window, use its full player-clock duration when it exceeds
  the minimum readability estimate. This retains the final sentence through
  the authored endpoint instead of releasing a couch-readable chat early.
- When a narrative range is constrained, allocate chatlog readability before
  static quote or source records; preserve explicitly approved cadence locks.
- Derive Track 0's rotating HUD queue directly from the authored plan and keep
  duplicate status lines; deduping breaks the approved finale cadence.

## A mark standing in for a glyph is still typography

`SEVEN PILLARS · ONE COMMUNITY · ONE DESTINY` sets its separators as the
Kubernetes helm. It appears on two surfaces — the `/wolves/` standfirst and the
projected lobby sub — and both route through `WolvesHelmLine.vue`. A second
hand-rolled copy drifts from the first the moment either is touched.

The rules, which are the same ones the trailer's helm and sear already follow:

- **The copy is not edited, only painted.** The authored string still reads with
  its `·` in source; the component splits on that glyph and draws the mark in
  its place. Never store a version of the line with the separator removed.
- **Split on the separator alone, never the spaces around it.** The line's own
  word spacing and 0.34em tracking then set the air around the mark, so it sits
  in the gap the typography already made instead of one invented in CSS.
- **The mark is `brands/kubernetes-icon-white.svg`** — CNCF's published white
  symbolic icon, reproduced unmodified.
- **`display: inline`.** Tailwind's preflight sets `img { display: block }`; a
  block-level separator takes its own line and breaks the phrase in three.
- **It carries the line's weight, not white's.** The type is `--wc-grey`
  (#8b8f96) on `--wc-bg` (#08090c). Matching that tone by alpha computes to
  about 0.55, but a solid heptagon reads heavier than thin mono strokes at the
  same measured tone, so the shipped value is optically compensated to 0.5. A
  separator's job is to be felt, not looked at.
- **Decorative to assistive technology.** `alt=""` and `aria-hidden="true"`;
  the phrases are already separated in the accessible text.

Measure it rather than judging it on a laptop: the mark is ~8px on the teaser
standfirst and ~10px on the 1920 lobby, so check the rendered bounds and the
optical centring against the caps, and confirm the wider mark did not introduce
a wrap at 390px — compare the host's line-box height against the same line set
with plain middots. `src/tests/wolvesHelmLine.test.ts` pins the rest.
