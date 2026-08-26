# Red flags

The full defect catalogue for Wolves runtime engineering. Every entry is derived from a real failure on this route. Scan the group that matches the surface you are changing.

Back to [`../SKILL.md`](../SKILL.md).

## Contents

Grouped roughly by surface: boundaries and scheduling, transport and buffers, images and framing, then store and data integrity.

## The catalogue

- Content work is used to justify component or style changes.
- A fullscreen overlay lacks the required containing-block treatment.
- A second YouTube API loader or transport is introduced.
- Browser bounds and player states are not checked.
- A musical moment is scheduled with a round number instead of the measured
  beat in `TRACK_ZERO_SECTIONS`.
- A cue window on a scored segment is picked by dividing the track evenly, or by
  ear, instead of from measured section boundaries. Measure the source: the
  Director's Cut Tribulation grid in `wolves-directors-cut-intro.ts` is the
  agreement between a voted Laplacian structural segmentation (k = 4..10) and an
  independent MFCC-novelty peak pick.
- A scored `text` segment ends only on `elapsed >= duration`. A real player's
  `getCurrentTime()` routinely plateaus below the duration it reports for the
  same upload, so a card authored to its source's full container hangs on its
  last cue with no way to recover live. Take the completion signal from the
  player: its `ENDED` state, its `onError`, and a bounded stall watchdog — never
  by shortening the authored music, and never by running a wall clock alongside
  the audio clock.
- An `ENDED` from the background audio embed is trusted outside the track's
  measured silent tail. A YouTube embed publishes state around ad breaks and a
  mid-roll ad freezes the clock at a *nonzero* time, so believing that signal
  mid-piece trades a hang for a truncation — it ends the scored act in front of
  the room. Scope every end-of-track claim to the same measured window.
- Releasing a scored card to its own clock (`releaseAudioClock()`) clears
  everything about the *stall watchdog* but leaves the `ended` flag that
  triggered the release still set. That flag is stale the instant the release
  happens — it was only ever true for a reading outside the end window — but it
  is still read by the next completion check. If the audio clock never
  recovers, the card's own free-running clock eventually re-enters the end
  window on its own, and the stale `true` completes the card there instead of
  at the authored duration: up to `TEXT_SEGMENT_END_SLACK_SECONDS` (1s) early.
  Bounded by the same measurement that makes the window safe to complete in at
  all (entirely after the source's last audible sample), so it never truncates
  audible content — but it is still wrong, and cheap to fix: clear the `ended`
  flag in the same place that clears everything else about the release.
- A background audio embed is constructed with `events: {}`. That embed is the
  scored card's clock; with no `onStateChange`/`onError` the card has no way to
  learn the clock died.
- An authored window on one video source is transposed to a second upload of the
  same footage without re-measuring that upload's own frames. A content offset
  transposes; a cutoff does not, because two uploads can end differently. See
  `../../../reference/wolves-intro-and-overlay.md`.
- A long text beat is given `emphasis: 'dominant'` on the strength of what it
  says rather than how tall it renders. Dominant is priced in frame height, and
  overflows a 1280x720 projector frame past `DIRECTORS_CUT_MAX_CUE_WORDS`.
- A cue's window is treated as its text's dwell time. The window is how long the
  *shot* runs; a thought priced at 6.8s reading cost left up on a 38s shot reads
  as a frozen show. Price text separately (`textHoldSeconds`) and let the image
  play on wordless once the words are read.
- A painting is rendered with `object-fit: cover` because it fills the frame.
  Cover crops: `c1-europa-landscape-v1` (2048x771) loses a third of its height on
  a 16:9 stage. Frame paintings `contain`, capped at their source pixels, and buy
  text legibility with a scrim rather than by dimming the art.
- A browser probe asks `getBoundingClientRect()` whether a `contain` image is
  cropped. It reports the element box, so letterboxed and cropped both answer
  1280x720. Derive the painted box from the decoded `naturalWidth`/`naturalHeight`
  and assert the artwork ledger matches that decode.
- A responsive rule hides text globally when only some surfaces should lose it.
  The blanket `@media (max-width: 640px) { .wolves-intro-overlay-text { display: none } }`
  silently blanked the entire Director narration; scope such rules with `:not()`
  and give the surviving surface its own type scale.
- A new CSS rule at one-class specificity is placed earlier in the sheet than
  the rule it must beat. Equal specificity resolves on source order, so the new
  rule silently does nothing and no unit test can see it. Give the variant its
  own higher-specificity selector and place it after the rules it overrides.
- A rule inserted by a careless anchor match lands *inside* a
  `@media (max-width: 640px)` block, where it does nothing at projector sizes
  and corrupts the selector above it. When inserting by anchor, check the brace
  context of the match, not just the match.
- A caption is bound to the wrong reactive source. Text outlives its shot by a
  fade, so a caption keyed to the scene cue takes its geometry from the
  *previous* shot — every unit test green, the offset visible only laid out in
  a browser. See
  [`../../../reference/wolves-intro-and-overlay.md`](../../../reference/wolves-intro-and-overlay.md).
  Anything about layout, cascade, or paint needs a browser assertion; a green
  unit suite says nothing about the screen.
- A Director prologue cue uses the shared 7.8s somber fade. That consumes most
  of a short musical window and makes a seek look blank; the Director's Cut has
  its own short reveal followed by a real reading hold.
- A browser seek probe declares success because the outgoing image stayed
  stable twice. Wait for the transport to publish the target time **and** for
  the intended image to decode and take the active layer.
- A probe of a cross-fading surface settles on one condition. Settle on **two**
  independent ones before measuring: the caption is the intended cue's text
  **and** the decoded image is the intended record's (compare
  `naturalWidth`/`naturalHeight` against the ledger's recorded geometry).
  Waiting on either alone samples a crossfade in progress, where the outgoing
  shot's words sit over the incoming shot's picture — and the same probe has
  produced both a false positive (a collision reported that did not exist) and
  a false negative (a real one hidden), depending on which single condition
  was used.
- A legibility scrim is conditioned on the shot rather than on the caption. A
  scrim exists to buy contrast for text; rendered over a wordless shot it is
  pure haze, darkening artwork that has nothing to pay for. The prologue's
  scrim keyed off `backgroundFraming`, so it dimmed the bottom 46% of all six
  wordless montage beats — measured 26.9 to 41.3 luminance recovered on the
  brightest plate once it was scoped to `caption && captionVisible`. Condition
  it on exactly what the caption itself renders on, so the two cannot drift
  apart, and have the test assert its **absence** on a wordless shot as well as
  its presence on a captioned one.
- A base `opacity` below 1 on the painting layer. It reads as "dimming" but it
  is compositing against the black overlay beneath, and any shot whose own
  animation does not override it is silently the haziest frame in the show.
- A probe settles on its conditions and then measures in a *second* call. Against
  a live player the show clock keeps running, so the frame measured is not the
  frame that satisfied the wait — a correct cut reported the wrong plate on two
  shots that way. Return the measurements *from* the settle predicate, so the
  frame checked is the frame that settled — `page.waitForFunction` resolves to a
  `JSHandle` of whatever truthy value the predicate returned, so read it with
  `.jsonValue()` (`source: /microsoft/playwright`).
  `scripts/wolves-frame-audit.mjs` does this.
- A probe treats a wordless shot as a shot with no text on screen. A cue's words
  outlive its shot by a fade, so the previous line is still clearing at the start
  of the next one; requiring an empty caption stalls past the end of a short
  window and measures the following shot. Require the outgoing text to be gone
  **or visibly clearing**, not instantly absent.
- A browser probe counts every failed request as a defect. The embedded player
  beats its own telemetry endpoints constantly and they fail for reasons that
  have nothing to do with the show; scope the check to the app's own origin or
  the real 404 drowns.
- A closing animation is computed per clock tick. The transport stops publishing
  time in the final `PRE_END_THRESHOLD_S` of a segment and a YouTube clock
  plateaus before that anyway, so `(time - start) / span` freezes the show
  half-faded with no way to recover live. Latch a CSS transition on one boolean
  crossing and complete it from the store's finished state.
- A takeover is verified by asserting that nothing changed. "The same slide is
  still on stage" passes identically whether the thing that should have covered
  it exists or not. Measure the taker: zero rendered area for what should be
  covered, full-viewport bounds for what should be covering.
- A source video's frames are measured after a fast seek (`ffmpeg -ss` before
  `-i`), which offsets every timestamp by up to a GOP — 0.208s on the Director's
  Cut companion. Decode from frame 0 when the frame number is going to be
  anchored to a beat.
- A second surface reads a companion video's own clock as if it were the show's.
  There is one clock, the soundtrack player's; a companion's time is read only
  to detect drift, corrected only when the drift is material, and rate limited
  by elapsed show time. A backward transport seek moves the clock behind the
  last correction and must be treated as a new alignment opportunity, not
  rejected because its absolute time is inside the suppression interval.
- A companion readiness check ends when the constructor resolves. Construction
  can finish after the measured reveal window has already lost the source cut
  that makes the edit meaningful. Bound readiness to a source-derived clock
  deadline; if it expires, dispose the player, clear the memoised build result,
  and refuse a late pop-in. A backward seek inside the same window must reset
  that verdict and rebuild cleanly, but must align once to the new soundtrack
  time rather than adding a second park seek during the reset.
- A drift or retry rate limiter has no test that drives *repeated* out-of-
  tolerance polls inside one suppression interval. Assert one corrective seek
  across the burst and another after the interval, or deleting the guard —
  which turns the corner into a stutter loop in front of the room — stays green.
- An optional embed's availability is a plain `let`, not reactive state ANDed
  into its visibility. A dead player still paints its lit frame — black fill,
  ring, shadow — for the whole reveal window, which from the back row is a
  broken slide. Mark unavailable on every failure path: loader rejection,
  missing constructor or host, and `onError`.
- `destroy()` is reachable twice for the same player, typically the handle the
  component holds and the memoised build result it came from. `YT.Player`
  teardown is not idempotent; guard disposal by instance identity and count
  destroys *per instance* in tests, because aggregate counts cannot tell two
  players destroyed once from one player destroyed twice.
- A player whose `onError` fires from inside `new YT.Player(...)` is discarded
  without teardown. The instance is already a live iframe, a window message
  listener and a media element, and the handler runs before the expression
  returns — so the constructor's own return has to finish the disposal.
- A page ends on a title such as `Dr.`, orphaning the name it introduces, or on
  a preposition or article, making the audience wait a page turn for the rest of
  the phrase.
- A slot is assumed to display its record's authored pages without checking
  `affordablePageCount()` against the slot duration.
- A prewarmed buffer is played and never parked, or is promoted without an
  explicit seek to its opening frame.
- A buffer is promoted to air on `sides[side].segmentIndex` alone, without
  checking `getVideoData().video_id` against the segment it is supposed to be.
- A finale companion is assumed correct because its constructor was given the
  approved id. Read `getVideoData().video_id` after cueing and again when
  `PLAYING` is reported; a wrong upload must never be synchronized or shown.
  A DEV-only evidence hook should expose the live player id, source time,
  readiness, synchronization, mute and volume state so a browser harness reads
  the runtime rather than mock-player bookkeeping.
- An `onError` is handled only for the active side, so a failure on the buffer
  holding the *next* segment is discarded.
- A prewarm is silenced with `setVolume(0)` instead of `mute()`, or a path that
  puts a side on air forgets to lift the mute.
- YouTube's own captions are suppressed with `cc_load_policy: 0` alone. That is a
  default a viewer preference overrides; the module has to be unloaded, on
  `onApiChange` as well as `onReady`. See
  `../../../reference/wolves-intro-and-overlay.md`.
- A background layer's progress is derived from a hardcoded segment count, or
  animated with a curve that returns to where it started. See
  `../../../reference/wolves-slide-scheduling.md` on the wallpaper ramp.
- A warmed player is promoted with `loadVideoById()` or a second `seekTo()`. The
  warm buffer is already cued to its opening frame; reloading it discards the
  warm and reintroduces the stutter the prewarm existed to remove. Promote by
  adopting the instance, lifting the mute, and playing.
- A prewarmed player is built with different event handlers than the cold path.
  YouTube fixes handlers at construction, so a parked player cannot be rewired
  later. Share one constructor and have every handler guard on "am I the show
  player?" so a parked player's CUED/ENDED/error traffic cannot drive the
  sequence.
- A parked player is hidden with `display: none` or `v-show`. That can prevent
  composition and un-warm the warm. Use `opacity: 0` plus `aria-hidden`/`inert`.
- A takeover is considered complete because an opaque frame covers the old
  slide. Unmount the ordinary grid and sidecar with the finale; assert zero
  rendered slide layers, not merely that the old image is hard to see. The
  inverse probe must seek back and prove the ordinary chrome returns.
- A handoff holds the outgoing image on an unbounded await of the incoming
  player's `PLAYING`. If that event never arrives the show is stuck on a still
  frame with no recovery. Bound the hold and release on whichever lands first.
- A boundary, skip, or recovery load can run before `start()`, so it plays a
  segment underneath the intro.
- Only the inactive buffer is prewarmed, so the first track enters cold.
- A crossfade length is read from the outgoing segment.
- A startup or readiness await has no timeout.
- A bounded await sits *inside* an unbounded one, so the bound is decorative.
- A prewarm, cache warm, or other optimisation is awaited on the critical path
  to first audio.
- A paging slot and its display-clear beat are conflated. Preserve the
  `(duration, elapsed)` window across a mid-run handoff so the bulletin does
  not re-page, then clear it on its own measured beat before the next clause;
  shortening the slot drops authored pages instead of making them read faster.
- A clause is kept mounted after terminal black because it is "under" the
  fade. Remove terminal content from the DOM when the finished-state backstop
  reaches black; otherwise a later seek or accessibility tree can expose stale
  closing prose.
- A cold skip switches sides and ramps before the incoming player reports
  `PLAYING`.
- The transport clock stops publishing while a crossfade runs.
- A clock advances by a hardcoded constant per tick, or by accumulating deltas.
- A crossfade is triggered by a lead shorter than the fade it starts.
- A test double for a player exposes `getCurrentTime()` that never advances, or a
  `pauseVideo()`/`playVideo()` that does not emit the state change the real
  IFrame API emits.
- A test carries a typed-in number derived from the current source media — an
  audible-second bound, a seek target, a duration. Swapping the prologue's
  score (325.6s to 134.65s) broke assertions that were never wrong about the
  code: a bound of 321.34 and seek targets of 140 and 200 were valid mid-piece
  times under the old track and past the end of the new one. Derive
  expectations from the exported constants so the media can change underneath
  them — see "Derive harness expectations from the live modules" in
  [`../../../reference/wolves-test-harnesses.md`](../../../reference/wolves-test-harnesses.md).
  This failure mode has bitten this repo at least three times.
- Buffer bookkeeping (a prewarm park's pause and seek) is published to the store
  as show transport state.
- Playlist metadata is indexed by `segmentIndex`/`trackIndex` instead of
  resolved by `id`/`youtubeVideoId`. (`trackIndex` still drives ordering and
  branching; the ban is on metadata lookup by position.)
- Back-catalogue title credit is baked into generated `segment.title` data
  instead of formatting the normalized `title` and `artist` fields at the
  display boundary. The media widget and stage nameplate share
  `TrackCredit.vue`; transition cards keep their separate artist line.
- A hand-maintained array that parallels `CINEMATIC_SEGMENTS` (durations, BPM,
  chat keys) is not asserted against it by id.
- An authored sequence has a gap (`TRANSITION_FIVE` with no `TRANSITION_FOUR`,
  chapter labels stopping short of the part count) and it is read as style
  rather than as evidence of a deletion.
- A change removes authored content — a segment, lore, prose — without the
  owner's explicit word, or its justification does not match its diff.
- A raw `experienceId === WOLVES_EXPERIENCE.id` (or `manifest.id === ...`) check
  is used to mean "this is an authored Wolves presentation." A second Wolves
  manifest with a different top-level `id` (the Director's Cut) silently reads
  as a generic back-catalogue album, and every place that check is duplicated
  can drift independently (`TheaterExperience.vue` once carried its own inline
  copy of the same check on a single prop, computing a different answer than
  the component's own `isWolvesExperience`). Use the manifest's typed
  `presentationProfile` and the store's `isWolvesPresentation` getter (or the
  `isWolvesPresentationProfile()` helper) instead of comparing manifest
  identity; a "which specific presentation" question (restoring the standard
  show after a Director's Cut run) still compares against
  `WOLVES_STANDARD_PROFILE_ID`/`WOLVES_DIRECTORS_CUT_PROFILE_ID` explicitly.
- The `PresentationProfile` type lives in `experience-manifest.ts`; the
  `WOLVES_STANDARD_PROFILE_ID`/`WOLVES_DIRECTORS_CUT_PROFILE_ID` constants and
  the `isWolvesPresentationProfile()` helper live in `cinematic.ts` alongside
  the store that consumes them. No `wolves-presentation-profiles.ts` (or
  similarly named standalone module) exists, and none should be created just
  to match an earlier planning document's file-structure sketch — an external
  plan naming a path is not itself a benefit. Only move these definitions if a
  concrete benefit is identified first (e.g. an import cycle these are
  currently trapped in); otherwise leave them where their nearest consumer
  already imports them from.
- A component with more than one `presentationProfile`-dependent prop needs a
  probe test *per prop*, not one test that happens to cover the prop most
  recently worked on. Mount the real component and read what it actually passes
  down — stubbing `WolvesLoreColumn` or testing the timeline data module in
  isolation cannot see an unbranched prop.
- Segments are module-level state too (`activeSegments` in `cinematic.ts`), the
  same class of bug as the intro list documented in
  [`../../../reference/wolves-intro-and-overlay.md`](../../../reference/wolves-intro-and-overlay.md).
  A test that calls `loadExperience()` with a non-default manifest (Director's
  Cut, a generic album) and does not restore `WOLVES_EXPERIENCE` in `afterEach`
  leaks that manifest's segments into every later test in the file —
  `setActivePinia(createPinia())` alone does not reset it.
- A slide schedule is asked to cut faster without checking both the preload
  budget and the projection floor. The decode gate only helps if the lookahead
  is ahead of it: `PRELOAD_WINDOW_SECONDS / MAX_LOOKAHEAD_SLIDES` (8s / 12) is
  ~0.67s on an average hold, while the Director's four-beat Track 0 floor is
  about 1.58s at the fastest passage. Two measured beats produced a random
  slideshow and did not leave enough time for a decoded image to settle and
  register. Keep the preload constants and the schedule's derived floor in one
  test seam.
- A count of slides is handed to `trackZeroBeatCuts` from a pool size rather
  than derived from the section's beat budget. Leftover beats all land on
  **slide 0**, so an undersized pool opens the section on one enormous hold; an
  oversized one (past `floor(totalBeats / shortestTier)`) silently abandons the
  measured grid for a uniform division and every cut in that section stops
  landing on a beat. Derive the count from the budget and clamp it to both
  bounds.
- A second cut of a scored segment invents its own handoff timestamp. The
  Director's Cut stops its picture edit on `DIRECTORS_CUT_FINALE_START`, which
  *is* `TRACK_ZERO_SECTIONS.bkEnd` — an existing measured section boundary the
  standard show already uses — not a round number chosen for how much room it
  leaves.
- A browser probe reads the slide on stage after a fixed wait, or as "the first
  layer above half opacity". The swap is gated on fetch, decode and then the
  crossfade, and mid-dissolve both buffers are above half — so the probe samples
  the previous frame or the outgoing buffer and reports a scheduling bug that
  does not exist. Poll until the stage settles and take the highest-opacity
  layer. Related: a `type: 'daynight'` slide renders `dayName`/`nightName`,
  never `path`.
- A profile-specific narrative timeline is tested only as data, while the live
  theater seam still reads the standard timeline or falls back to the last
  record. Mount `TheaterExperience` with a lore probe and walk a quote entrance,
  an intentional image-only gap, the finale-owned bulletin, and its clearing
  boundary. A `null` slot is an authored empty stage, not a request to retain
  the previous artifact; pass an empty id through the component so the renderer
  removes the stale panel.
- A set of large assets is predecoded by firing every `new Image()` at once
  "because there is idle time". There is no idle network in this show: the
  Track 0 slide preloader and the scored audio embed are on the same connection
  pool. Warming the ten Director's Cut concept paintings ten-wide starved the
  gallery hard enough that `tests/wolves-directors-cut-slides.mjs` found the
  previous slide still on stage at the measured 35.666s cut — the harness saw
  it, no unit test could. Chain the warms on `decode()` so exactly one is in
  flight, warm in the order the assets are displayed so the chain stays ahead of
  the cue that needs each one, and abandon the chain in `onBeforeUnmount` so a
  skipped intro stops taking bandwidth from the show that replaced it.
- A predecode is keyed to a *kind* of segment ("any text card") rather than to
  the authored segment id that owns the assets. The standard intro then pays for
  assets it never shows. Assert the negative: mount the other sequence and
  require zero requests for those URLs.
- A surface with a sub-second hidden lead is hidden with `v-show`. `display:
  none` licenses a browser to skip layout, paint and compositing for the whole
  subtree, so the element can be asked for its first composite on the exact
  frame it was supposed to be already playing — the Director's Cut companion's
  lead is one measured beat, 0.395s. Keep it rendered and make it invisible
  (`opacity: 0`, `pointer-events: none`, `aria-hidden`, `inert`, and
  `will-change: opacity` to force the layer up front); reserve removal from the
  DOM for the surface being genuinely unavailable. Note that `visibility:
  hidden` is not a substitute — it suppresses paint for the subtree too.
- A browser harness computes `visible` from `display`/`visibility` and bounds
  only. Once anything is deliberately rendered-but-transparent, that helper
  scores a warming surface as on stage. Read `opacity` too, and expose
  `rendered` as its own field so "hidden" and "not there" stay separable.
- A per-segment treatment is gated on position (`trackIndex !== 0`) when a
  second presentation runs a different schedule at the same position. The
  backdrop blur was excluded from Track 0 because the *standard* cut does not
  crossfade rapidly there; the Director's Cut runs a lock-free montage at the
  same index and puts blur work back on the slide-change path. Gate treatments
  on what the segment actually does — the profile — not on where it sits.
- A trust boundary that validates only *structure* lets a generated file carry
  *authority*. `parseBackCatalogue()` checks ids, titles and segments, but
  `presentationProfile` selects the authored Wolves intro, timeline, slide
  schedule and finale — the generator never writes it, so anything but
  absent/`'generic'` is refused at the boundary rather than trusted.
- A control added to the frozen presentation is wired as a dependency rather
  than an affordance. The show runs unattended to a room with no input device,
  so the default must be a separate exported constant (not "the first entry in
  the list"), an unknown value must fall back to it, and a test must prove an
  untouched run completes. See `PROLOGUE_MOODS` in
  [`../../../reference/wolves-intro-and-overlay.md`](../../../reference/wolves-intro-and-overlay.md).
- A `<select>` is rendered inside the overlay root. `handleOverlayClick`
  ignores `button, a, input, [role="button"]` and **not** `select`, so opening
  a picker inside the overlay advances the cue every time. Keep controls
  outside the overlay root or extend the guard.

