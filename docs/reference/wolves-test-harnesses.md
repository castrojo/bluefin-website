# Wolves browser harnesses and player mocks

Repository boundary: [`../../AGENTS.md`](../../AGENTS.md).

Defect-derived invariants for driving `/wolves/experience/` from Playwright and
unit tests: reaching Track 0, keeping the movie-flow harness alive, emitting a
real player load lifecycle from a mock, and deriving expectations from live
modules instead of constants.

Procedure and approval gate: [`../skills/wolves-runtime-engineering/SKILL.md`](../skills/wolves-runtime-engineering/SKILL.md).
Show-wide production facts: [`wolves-runtime.md`](wolves-runtime.md).

Numbering in this file: "Track 0" is the comic reader's `trackIndex` 0 —
"7 Days to the Wolves", segment index 0 — the first music after the intro.
`wolves-runtime.md` uses show numbering, where Track 0 is the Destiny intro.

## Driving Track 0 in a browser

Reaching Track 0 in Chromium is not automatic. The standalone Playwright scripts
in `tests/*.mjs` mock the YouTube IFrame API and must then leave the Destiny
intro before any Track 0 selector exists.

**You cannot leave the intro with the progress bar.** `handleSegmentSeek` in
`src/WolvesApp.vue` routes a bar click to `intro.seekToRatio()` while the intro
overlay is showing, which seeks *inside* the intro sequence. Harnesses that
clicked `.wc-widget-progress` at an "overall" ratio sat in the intro forever and
timed out waiting for `.wc-trackzero-grid`.

Use the DEV-only hooks instead. Three exist, published at different times:
`window.__wolvesDurations` (`WolvesApp.vue`, from app start),
`window.__wolvesIntro` (`WolvesIntroOverlay.vue`, while the overlay is mounted),
and `window.__wolvesCinematic` (`WolvesApp.vue`, only after the stage starts).
Waiting on `__wolvesCinematic` while still in the intro therefore hangs forever.

`__wolvesDurations` exposes `intro()`, `overall()`, and `skipIntro()`. Read the
durations from it rather than hard-coding them: the literals `119.5` and `1952.5`
that both harnesses carried have already drifted, which is what silently broke
them. All three hooks are `import.meta.env.DEV` gated and absent from the
production bundle — verify with
`grep -c __wolvesDurations dist/assets/wolves-*.js`, which must print `0`.

`skipIntro()` starts the real stage, so a harness that has not installed the
YouTube IFrame mock hangs on `stage.start()`. Install the mock first; copy it
from `tests/wolves-trackzero-sidecar-real-player.mjs`.

**Do not build a new full-show harness to check a Track 0 anchor.** This was
tried and abandoned four times; the walk-the-Vue-tree route (clicking
`.wc-lobby-enter`, then looping the overlay's exposed `next()`) is not
repeatable — the step count needed to land in Track 0 is unstable, and
`window.__wolvesCinematic.seekTo` is offset by the intro, so a Track 0 time seeks
back into the intro and unmounts the lore column. Playwright's 30 s default
locator timeout makes each failed read look like a hang. Assert anchored moments
in `src/tests/wolvesLoreColumn.test.ts` against the page model instead, where the
Sarah-on-`bridgeStart` regression test already lives, and reserve browser runs
for the existing `tests/wolves-movie-flow.mjs`.

To reach the welcome card in a probe, click the lobby's **Meet your Teammates**
button (`emit('enter')`). The Director's Cut button opens on the scored
prologue instead — its intro carries no welcome card. The card's prose renders
as `.wolves-intro-title-card-quote`, *not* `.wolves-intro-overlay-text` —
waiting on the latter silently burns the card's whole runtime before matching
the segment after it.

`tests/wolves-movie-flow.mjs` reads the contributor hero windows live from
`wolves-track-zero-slides.ts` and straddles each one from Jono through Jorge by
a small epsilon. The Laura -> Tophee -> Reza windows beyond that are still not
covered, and that kind of blind spot is exactly where a dropped portrait once
shipped unnoticed. Extend coverage past any boundary you change.

## Adding a segment breaks the movie-flow harness at the front

`tests/wolves-movie-flow.mjs` (CI job `wolves-movie-flow`) drives the show from
the lobby door. It assumes the Destiny player mounts within ten seconds of
entering, so prepending any segment ahead of it kills the entire run at step
three and the remaining twenty-odd assertions never execute. The job goes red
with a **passing** count of two, which reads like a small failure and is not.
When you add a segment to the front, teach the harness to step past it: assert
the new segment, then advance with the transport control before waiting on the
player. A shrinking "passed" count is the signal that the harness is dying
early rather than failing a check.

Three traps in that harness, all of which cost real time:

- **Cross-dissolves put two elements in the DOM at once.** `[data-comic-hero-shot]`
  matches both the leaving and entering image mid-fade — a strict-mode violation,
  not a failed assertion. Qualify with `:not(.comic-hero-shot-fade-leave-active)`.
- **The transport widget auto-hides.** Scripted `page.evaluate()` seeks are not
  pointer input, so the controls slide off screen and clicks report "outside of
  the viewport". Nudge `page.mouse` and let the reveal transition finish first.
  This also means never clicking `Next` with a raw `page.getByLabel('Next')` —
  two controls share the label (overlay + transport), and the raw locator
  intermittently resolves to the off-viewport one and times out after 30 s. Use
  the harness's `clickControl()` helper, which nudges the pointer and clicks the
  visible match.
- **Cue windows drift out from under seek times.** A seek one second before a
  plate's window opens fails by timeout, which looks like a missing element
  rather than a stale constant. Check the cue's `start`/`end` in
  `wolves-intro-sequence.ts` before believing the component is broken.

## The mock player must emit the real load lifecycle

`useDualBufferPlayer.start()` awaits a promise that only resolves when the
**active** player fires an `onStateChange` to `PLAYING` after
`loadVideoById(...)`. The real IFrame API buffers and autoplays after a load;
a mock whose `loadVideoById` only records the video id never emits that
transition, so `start()` never settles, `handleIntroComplete()` in
`WolvesApp.vue` never reaches `introTransparent = true`, and
`.wolves-intro-overlay--transparent-handoff` never appears. That failure has
shipped: the harness dies at the intro handoff with the overlay stuck opaque,
and every Track 0 assertion after it silently never runs.

When writing or copying the mock (`tests/wolves-movie-flow.mjs` has the
canonical one):

- `loadVideoById` must set `currentTime` to `startSeconds` and then emit
  `BUFFERING` → `PLAYING` state changes asynchronously (microtask is enough).
- `cueVideoById` must set `currentTime` and emit `CUED` — the dual buffer cues
  the inactive side and then prewarms it with `playVideo`, which parks it back
  on `PLAYING` (`parkPrewarmedSide`).
- Forcing `ENDED` or seeking past the intro cut does **not** unstick the
  handoff; the await is on the *cinematic stage's* load-play transition, not
  on the intro player at all.

## Derive harness expectations from the live modules, not constants

Most of the movie-flow harness's historical failures were stale constants,
not runtime defects. The show's timing is derived — lore slots from reading
cost (`wolves-narrative-timeline.ts`), rotating signals paced by
`getTrackZeroHudLabel`, slide windows re-measured in
`wolves-track-zero-slides.ts` — so any hard-coded time or expected string in a
test drifts the moment content is re-edited. Under the Vite dev server a
Playwright page can import the authored modules directly:

```js
const timeline = await page.evaluate(async () => {
  const mod = await import('/src/data/wolves-narrative-timeline.ts')
  return mod.wolvesNarrativeTimeline
})
```

Use this to compute slot boundaries, slide-window straddles (± a small
epsilon; the hero-run windows have already shifted by 0.001 s once), the
paced finale message list (`getTrackZeroSectionMessages(4)` — the old
`wolves-incoming-signal.txt` is no longer the runtime source), and the air
time of a specific rotating signal (scan `getTrackZeroHudLabel` over the
window). Assert the DOM against those derived values. Selectors go stale the
same way: the lore title is `.lore-dossier-title` (`LoreRecordHeader`), not
the old `.conversation-title`, and the lore page viewport intentionally clips
(`overflow: hidden` in `lore-dossier.scss`) — it is not a scroll surface.

## The vitest comic-reader tests must drive the image decode gate

jsdom never fires `image.onload`. `WolvesComicReader.vue` only swaps the
visible slide once the incoming image has decoded (the decode gate that keeps
the wallpaper from flashing through an empty buffer), so a unit test running
on the stock global `Image` never advances: every "slide at time T" assertion
observes the first slide forever, and the failure reads like a content drift
when it is really a harness stall. This one gap once put 17 entries into
`tests/known-failures.txt`.

- Stub a self-completing image (`AutoImage` in
  `src/tests/wolvesComicReader.test.ts`: fire `onload` in a microtask from the
  `src` setter, `decode()` resolves) in the suite `beforeEach`.
- Flush after every clock advance. `await wrapper.setProps(...)` alone does not
  drain the preload promise chain, so the swap lands after the assertion. Use
  the suite's `advanceTo()` helper (setProps + `flushPromises`).
- The later-track gallery is remote-only for the Wolves experience
  (`wolves-runtime.md`, "Later-track gallery policy"): while the Flickr feed is
  pending or failed there is no local fallback and no caption. Tests mounting
  later tracks must resolve the `flickr-photos.json` fetch before asserting
  slides, and must not expect local people images to carry forward.
- The later-track gallery shuffles with live `Math.random`. Pin it
  (`vi.spyOn(Math, 'random')`) before asserting which photo lands on which
  track, or the assertion flakes roughly one run in pool-size.
- Assert Track 0 hero windows from the `wolves-track-zero-slides.ts` constants
  (`hikariTrackZeroWindow.startTime`, …), never re-typed literals: the windows
  were re-measured once already and every hardcoded boundary failed off by one
  slide.

## A real player is the only way to see what a buffer is holding

`tests/wolves-ghosts-boundary.mjs` drives the Part I → Part II seam against
**real** YouTube players and asserts the invariant the audience experiences:
whatever segment the store is naming on screen, the buffer on air is holding that
segment or nothing — never a different one.

No mocked harness can check this. The mock *is* the runtime's bookkeeping, so a
buffer can never hold anything other than what it was asked to hold, which is
exactly the drift that shipped as "Ghosts In The Mist is broken, the Avatar song
comes up instead". The observability it needs is `__wolvesCinematic.buffers()`
(`bufferSnapshot()` in `useDualBufferPlayer`), which reports each side's intended
segment beside its real `getVideoData().video_id`.

Two things about running it:

- **Playwright's bundled Chromium has no proprietary codecs**, so YouTube commonly
  answers with error 150 and no media attaches. That is an environment artifact,
  not a broken show. The harness therefore tolerates an *empty* buffer and fails
  only on a *wrong* one. Do not "fix" a local error-150 run by changing the runtime.
- The seam is uncovered by design. Part I → Part II is the one boundary
  `CinematicTransition.vue` deliberately runs without the overlay, so anything that
  goes wrong there is seen by the whole room.

## Reading the slide on stage is a timing problem, not a selector problem

A probe that seeks the transport, waits a fixed interval and then reads
`.flickr-img` is sampling a race. Both traps below reported the *wrong slide*,
not a flaky one, so they read as a scheduling bug that did not exist:

- **A fixed wait samples the previous frame.** The swap is gated on fetching and
  decoding a full-size image and then on the crossfade
  (`currentSlideTransitionDuration` = `min(duration >= 8 ? 1600 : 800,
  duration * 300)` ms). 700 ms after a seek the stage can still be holding the
  slide it was on. Poll until the stage settles — same `src` twice in a row with
  the visible layer at full opacity — instead of guessing a duration.
- **Both buffers are above half opacity mid-fade.** Picking "the first layer with
  opacity > 0.5" returns the **outgoing** buffer whenever it is earlier in the
  DOM. Take the layer with the highest opacity.
- **A day/night wallpaper never renders its `path`.** `getFlickrPhotoUrl` resolves
  `type: 'daynight'` through `dayName`/`nightName`, so asserting the rendered
  `src` against `slide.path` reports a false miss on exactly those slides.
  Compare against `[path, dayName, nightName]`.

`tests/wolves-directors-cut-slides.mjs` does all three, and rebuilds the expected
schedule in-page from `/src/data/wolves-directors-cut-slides.ts` rather than
carrying cut times as constants.

## The lore column's quote crossfade is the same trap, on a different clock

`WolvesLoreColumn`'s quote view (`QuoteLoreView.vue`) fades its text through a
`Transition name="quote-fade"` keyed on `record.id`
(`lore-dossier.scss`, 0.5s `opacity` transition), so a probe that seeks and reads
`.lore-quote-text` immediately after can sample the outgoing quote mid-fade —
same class of bug as sampling a slide mid-crossfade, on a different selector and
a shorter window. It has one extra trap the slide probe does not: the
attribution (`.lore-quote-meta`, in `LoreRecordHeader`'s header slot) sits
**outside** the `Transition` and updates immediately, so a probe that reads text
and attribution in the same tick can pair the *outgoing* quote's text with the
*incoming* quote's attribution — a combination that never exists on screen.
Poll both together until they agree across two reads, the same discipline
`slideAt()` uses for the image layers.

A Director's Cut prologue probe has a second, unrelated clock trap: the scored
card's clock is read from the background audio embed's `getCurrentTime()`, not
from wall time (see `wolves-runtime-engineering/SKILL.md`). A mock player whose
clock never advances on its own sits on the prologue's opening silent card
(`buildNarrationCues()`'s pre-`NARRATION_FIRST_MARK` dark window) forever,
however long the probe waits in real time — waiting longer does not help, only
advancing the mock's `currentTime` does.

## An element box does not answer a cropping question

`getBoundingClientRect()` on an `<img>` reports the **element** box, so a
painting letterboxed by `object-fit: contain` and one cropped by `cover` both
answer `1280x720` on a 16:9 stage. `wolves-directors-cut-prologue.mjs` first
"proved" whole-frame framing that way and passed against artwork it had not
looked at.

Measure the painted content box instead: read the browser's decoded
`naturalWidth`/`naturalHeight`, assert the artwork ledger's `sourceWidth`/
`sourceHeight` matches that decode — otherwise the probe is validating our own
assumption — then derive the painted box from the element box the way `contain`
is defined to compute it. Assert the painted aspect equals the source aspect,
that the scale never exceeds 1, and that the painting still reaches one axis of
the stage, or "framed whole" also passes for a postage stamp.

That distinction is what the panoramas turn on: `c1-europa-landscape-v1`
(2048x771) paints 1280x482 and `c7-early-throne-world-citadel` (2200x1611) paints
983x720 — neither is 1280x720, and under `cover` both were.

## A frozen slide is not a covered slide
`tests/wolves-directors-cut-slides.mjs` originally proved the reserved finale
interval by asserting the image on stage at 380 s was the *same* image as at
355 s. That passed for the wrong reason: the reader simply holds its last slide
when the schedule runs out, so the assertion scored a frozen ordinary slide as
a working finale, and would have kept passing if the finale never rendered.

Assert the negative instead. A covered element gives every descendant a
zero-area `getBoundingClientRect()`, so:

- the theater grid's computed `display` is `none`, **and**
- every `.flickr-photo-layer` has zero rendered area, **and**
- the finale's own frame measures the full viewport.

The same trap has a general form: *"nothing changed" is not evidence that the
thing that should have covered it exists.* Any probe of a takeover has to
measure the taker, not the absence of change in the taken.

## Measuring a swap needs a warm cache and a budget

The Director's schedule keeps a four-measured-beat floor (about 1.58 s at the
fastest passage), and the reader will not swap a slide until its full-size image
has fetched **and** decoded. Whether the last pre-finale window lands on time is
therefore a real, load-dependent question — and a cold-cache measurement
answers a different one (how fast is the network).

`wolves-directors-cut-slides.mjs` seeks that window once to warm it, then seeks
it again and polls until the expected image is on stage at full opacity,
failing if that takes longer than the window itself. A skipped swap fails the
same assertion, because the expected image never arrives at all.

## Mock evidence and real-media evidence are different claims

`wolves-directors-cut-finale.mjs` prints which of the two it is producing, and
they are not interchangeable:

- **Mock transport** (default) replaces `window.YT` with a deterministic fake.
  The show clock only moves when the harness seeks it, and the companion's own
  clock is frozen — which is deliberate, because a frozen companion is what a
  stalled embed looks like, so the drift correction has to fire and its seek
  target becomes directly observable. Nothing in this mode is evidence that
  YouTube decoded anything.
- **Real media** (`WOLVES_REAL_MEDIA=1`) loads the live IFrame API. Playwright's
  bundled Chromium has no proprietary codecs, and `WOLVES_CDP` can attach to a
  real Chrome instead (on a Flatpak host, launch it with `flatpak run
  --command=chrome com.google.Chrome --headless=new --remote-debugging-port=9333
  --remote-allow-origins='*'` and connect over CDP).

Real media mode **stands down rather than failing** when the browser cannot hold
the clock. `getCurrentTime()` answers a seek optimistically even when no media
ever decodes, and then the embed collapses back to 0 — so the precondition
samples the published time repeatedly and requires all of them to hold. One
sample reads the optimism as a working transport and produces a wall of
failures that say nothing about the change under test.

The same stand-down applies earlier if the real soundtrack cannot leave the
intro and mount Track 0 at all. A codec-free browser otherwise reports a
finale selector timeout, which is transport-environment failure rather than a
finale assertion. In mock mode the harness uses `__mockWolvesPlayers`; in both
modes the finale-specific checks read the DEV-only `__wolvesFinaleCompanion`
hook for the live player id, source time, readiness, synchronization, mute and
volume state. Mock bookkeeping is not real-media evidence.

## The full harness inventory

Every standalone Playwright script in `tests/`. Only `wolves-movie-flow` runs in
CI (`.github/workflows/ci.yml`); the rest are run by hand, which is why they go
stale unnoticed. All of them take `WOLVES_BASE_URL` (default
`http://127.0.0.1:5173`), so a baseline worktree can be served on another port.

The **Player** column is the load-bearing distinction. A *mock* harness installs
a deterministic `window.YT` fake via `addInitScript`: it can drive the whole
show offline, but the mock *is* the runtime's bookkeeping, so it can never see a
buffer holding the wrong video, audible prewarm bleed, or a real ad break. A
*real* harness talks to live YouTube embeds, which is the only evidence for
those classes — and on codec-free Chromium (Playwright's bundled build) it must
tolerate error 150, so a clean local run there is weaker evidence than it
looks.

| Harness | Player | Covers |
|---|---|---|
| `wolves-movie-flow.mjs` | Mock | The show end to end from the lobby door. The CI job. |
| `wolves-buffer-parking.mjs` | Mock | No prewarmed buffer runs away under the show. |
| `wolves-ghosts-boundary.mjs` | Real | The on-air buffer really holds the segment named on screen. |
| `wolves-intro-silence.mjs` | Real | The cinematic stays inaudible under the intro. |
| `wolves-intro-segments.mjs` | Mock | Intro sequence segments and cue windows. Fails on `main` here. |
| `wolves-intro-destiny-toggle.mjs` | Mock | Destiny voice-over toggle and widget bounds. Fails on `main` here. |
| `wolves-transition-chat.mjs` | Mock | Authored transition lore between parts. |
| `wolves-lobby-progress.mjs` | Mock | Lobby and progress readouts; reads live durations, never constants. |
| `wolves-immersive-layout.mjs` | Real | Track 0 immersive grid layout and widget bounds. |
| `wolves-trackzero-sidecar-real-player.mjs` | Mock | Track 0 desktop lore/video sidecar split; source of the canonical mock. |
| `wolves-lobby-directors-cut-cta.mjs` | None (lobby only) | Director's Cut CTA teaser bounds at fixed viewports. |
| `wolves-trackzero-handoff-probe.mjs` | Real (CDP) | Diagnostic probe: where the prologue → Track 0 handoff stops under a real embed. Reports, does not assert. |
| `wolves-directors-cut-slides.mjs` | Mock | Director's Cut Track 0 cut boundaries, the covered finale interval, the warm final pre-finale window, and the standard cut's hero locks. |
| `wolves-directors-cut-finale.mjs` | Both (mock default; `WOLVES_REAL_MEDIA=1` for real) | Director's Cut finale: every named anchor, the companion player's source seconds, chrome suppression, narrow-viewport placement and the terminal black. |
| `wolves-directors-cut-prologue.mjs` | Mock | Director's Cut scored prologue: every painting framed whole at source geometry, full brightness plus scrim, every cue rendering the lines it authored, the reading hold clearing while its shot runs, the warm-silent-promoted Ikora handoff, and the narration surviving a 390px viewport. |
| `navbar-visual.mjs` | None | Main-site navbar, not Wolves. |

## Answering "what is on screen at m:ss" without a browser
The harnesses above seek and screenshot. That is the right tool for *how it
looks* and the wrong one for *what is scheduled*: a probe only sees the seconds
it was told to visit, and a timestamp the owner reported can sit in the gap
between two of them. Nearby screenshots are not evidence for the exact second.

`scripts/wolves-cue-at.mjs` answers the scheduling question directly, with no
browser and no seek:

```bash
node scripts/wolves-cue-at.mjs 1:50        # defaults to the prologue
node scripts/wolves-cue-at.mjs prologue --all
```

It loads the authored modules through Vite's `ssrLoadModule`, so aliases and
TypeScript resolve exactly as the app resolves them and the answer cannot drift
from the show. Use it to find the cue, then use a harness or Chromium to judge
how that cue reads. Registration for further videos is the `VIDEOS` table in
`scripts/wolves-videos.mjs`, shared with the frame audit below so the two tools
cannot disagree about what "video 1" means.

## Auditing every shot of a video in a browser

`scripts/wolves-frame-audit.mjs` is the other half: it walks *every* cue of a
video in Chromium and checks the things a projected show fails on — the intended
plate is the one on screen, the painting is full-bleed, the caption sits inside
the frame with at least 24px of clearance, nothing errored and nothing 404ed.

```bash
npm run dev -- --port 5173 --strictPort
node scripts/wolves-frame-audit.mjs                             # exits non-zero on any problem
node scripts/wolves-frame-audit.mjs prologue --viewport 1280x720 --shots
```

Three things in it are load-bearing, and each is a bug this repository already
shipped:

- **It settles on two conditions**, the intended caption *and* the intended
  decoded plate. Either alone samples a crossfade in progress, where the outgoing
  shot's words sit over the incoming shot's picture. The same probe has reported a
  collision that did not exist and hidden one that did, depending on which single
  condition it used.
- **It measures inside the settle predicate**, not in a second call after it. The
  show clock keeps running against a live player, so anything measured after the
  wait resolves is a *different frame* than the one that satisfied it. That drift
  made a correct cut report the wrong plate on two shots. This works because
  `page.waitForFunction` resolves to a **`JSHandle` of the truthy value** the
  predicate returned, so the predicate can return its measurements and the caller
  reads them with `.jsonValue()` — verified against current Playwright docs
  (`source: /microsoft/playwright`), which use the same
  `waitForFunction(...).then(h => h.jsonValue())` shape in their own suite.
- **A wordless shot is not a shot with no text on screen.** A cue's words outlive
  its shot by a fade, so the previous line is still clearing at the start of the
  next one. Demanding an empty caption stalls past the end of a short window and
  measures the following shot instead.
- **Full-bleed means painted pixels, not the `<img>` rectangle.** `object-fit:
  contain` leaves the element at 1280×720 while a 4:3 image paints only 960×720.
  Derive the painted box from natural dimensions, fit, and object position; the
  audit's `--self-test` pins both contain and cover geometry.
- **Page exceptions are independent evidence.** Capture `pageerror` as well as
  console errors and failed local requests; an uncaught application exception
  can otherwise leave both network arrays empty and produce a false green.

Only the app's own requests count toward the request check: the embedded player
beats its telemetry endpoints constantly and they fail for reasons that have
nothing to do with the show.

`tests/wolves-intro-silence.mjs` covers the other half of that: the cinematic
buffers are prewarmed *during* the intro, so it watches them through that window
and fails if either becomes audible. It reads `__wolvesDurations.buffers()`, which
is published from app start precisely because `__wolvesCinematic` does not exist
until the stage has started — the absence of any intro-time view of the buffers is
how a segment playing over the intro reached a build.

Two intro harnesses, `wolves-intro-segments.mjs` and
`wolves-intro-destiny-toggle.mjs`, **fail on `main` in a codec-free Chromium** — the
first times out waiting for `.wolves-intro-overlay-player`, the second reports the
widget out of viewport bounds. Confirm against a baseline worktree before blaming a
change for either.

## A settle on the image is not a settle on the caption

`seekPrologue()` settles on a stable, fully-opaque *scene*. The caption is a
separately keyed element with its own 1.6s reveal, so a measurement taken on an
image settle reads whichever thought was on screen before the seek.

This is not hypothetical: the first version of the line-break assertion reported
every cue as two lines, 1111px wide — the opening cue's geometry, repeated
thirteen times, all passing. Wait for the expected caption to be on screen at
full opacity before measuring it.

Compare captions on letters alone when doing that. The overlay renders its
display type without punctuation, so an exact string match never settles. That
comparison is a settle condition, not a provenance check — wording is guarded in
`wolvesDirectorsCutIntro.test.ts`.
