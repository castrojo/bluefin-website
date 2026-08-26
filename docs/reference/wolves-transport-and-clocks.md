# Wolves transport and clocks

Repository boundary: [`../../AGENTS.md`](../../AGENTS.md).

Defect-derived invariants for the Wolves dual-buffer player, the transport
clock, and the mapping between segment indices and playlist tracks. Every rule
here was learned from a defect that reached a theater build.

Procedure and approval gate: [`../skills/wolves-runtime-engineering/SKILL.md`](../skills/wolves-runtime-engineering/SKILL.md).
Show-wide production facts: [`wolves-runtime.md`](wolves-runtime.md).

Numbering in this file: "Track 0" is playlist track 0 — segment index 0,
"7 Days to the Wolves", the first music after the intro. `wolves-runtime.md`
uses show numbering, where Track 0 is the Destiny intro.

## Transports and clocks

Three invariants, each learned from a defect that reached the theater build.

**A prewarmed buffer must be parked, and promoted by seek.** `cueNext()` starts
the inactive buffer to force YouTube to buffer, but an unparked buffer keeps
playing silently underneath the current segment for its entire duration. When
the next segment is longer than the current one it is already minutes in by the
time it is heard, and the audience loses the opening of the song. Park on the
`PLAYING` state change (pause, seek to opening frame, volume 0) *before* any
`side !== activeSide` early return, and have promotion seek to the opening frame
rather than trusting where the buffer happens to sit. The seek is the guarantee;
parking is the optimisation. This also drove a phantom "progress bar snapping"
report — one root cause, two symptoms, because the elapsed time published on the
first poll after the swap was whatever the runaway buffer had reached.

**Lead a crossfade by the whole fade, not by a threshold.** If the swap fires
`PRE_END_THRESHOLD_S` before the end but the ramp runs `crossfadeMs`, the
outgoing track reaches its real end while the incoming is barely up, and the
room gets a hole in the music. Lead by `PRE_END_THRESHOLD_S + crossfadeMs/1000`.
Do not pause the outgoing side early — let it play out under the fade, or the
last bars of the song are lost. Ramp on an equal-power sin/cos curve: two linear
ramps sum to a dip in perceived loudness at the midpoint.

**Derive elapsed from an origin; never accumulate.** A silent card with no
player to read still needs a clock. `currentTime += 0.2` on a 100ms interval ran
every silent card at double speed. Accumulating a measured delta fixes the speed
but still drifts, and lands on float error exactly at the boundary (ten `+= 0.1`
sum to 0.9999999999999999, so a card never reaches its own duration). Keep an
origin timestamp and compute `(performance.now() - origin) / 1000`. Pause by
trailing the origin; seek by rebasing it. This is the same principle as "every
lore view is a pure function of `elapsed`", applied to the one surface that has
to source the elapsed value.

**Fade the transport that is actually playing, not the one the fade was written
for.** The intro's authored `audioFadeOutSeconds` lives in `startTextSegment()`
and only touches `audioPlayer`, but the final intro segment is the Destiny
trailer — a `video` segment on the main `player`. So the trailer's audio was
severed dead by `destroyPlayer()` in the `done` watcher exactly as Track 0 came
up at full volume: hard cut, hole, slam. `WolvesIntroOverlay.vue` now ramps the
video player over `VIDEO_HANDOFF_FADE_SECONDS` on an equal-power cosine taper,
led from the 200 ms poll loop across the *final* segment's own closing seconds
(recomputed each tick, so seeking back out of the window restores full volume),
with a completion-time ramp covering every path that skips the lead fade — early
`ENDED`, `onError`, Skip, presenter Next. **Never delay `emit('complete')` for
it.** `handleIntroComplete()` awaits `stage.start()`, which awaits Track 0's
`PLAYING`, and the overlay is held opaque until that resolves; serialising the
ramp ahead of the emit lengthens the very gap the fade exists to close. Start
the ramp, emit, destroy on landing, and guard the ramp against unmount and a
re-entrant `done` by comparing the captured player against the live one.

**A park's transport events describe the buffer, not the show.**
`parkPrewarmedSide()` pauses and seeks the player, and once *both* sides prewarm
that pause happens on the ACTIVE side too. Published straight through, its
`PAUSED` told the store the show was paused: the widget rendered "Play" while the
intro was audibly playing, and `togglePlay()` — which branches on
`store.playing` — inverted the presenter's control. Suppress a side's events
while its park is in flight (`parking`), release the suppression on the `PAUSED`
that park caused, and release it again from every path that puts the side back on
air (`startIncoming()`, `cueNext()`, the cold-skip reset, `releasePlayers()`),
because a `PAUSED` that never lands would otherwise leave that side permanently
deaf to real transport events. Nothing but the unit suite covers this: a test
double whose `pauseVideo()` does not emit `PAUSED` cannot see it at all, and only
the standalone `tests/wolves-movie-flow.mjs` harness — which is not part of
`npm run test:gate` — caught it in a browser.

**A buffer is promoted on identity, never on bookkeeping.** `sides[side].segmentIndex`
is set the instant `cueVideoById()` is *called*. Nothing reconciled it against the
player afterwards, so a cue that errored, was refused for this origin, or simply never
landed left the intent in place and the boundary put that buffer on air anyway. The
store advanced regardless — so the show ran the next chapter's title, chapter number,
lore column, and slides over the wrong song, or over silence. Reported from a build as
"Ghosts In The Mist is broken, the Avatar song comes up instead": the words and slides
said Part II while the room heard something else.

Check `getVideoData().video_id` against the target segment's `youtubeId` before
promoting (`bufferCanPlay()`), and on a mismatch hard-load the authored target while
holding the outgoing side on air until the incoming reports `PLAYING` — the cold-skip
guarantee, reused. Treat an *unknown* id as usable: the check exists to catch a buffer
that is provably wrong, not to invent a new way for the show to refuse to advance.
`getVideoData` is undocumented and throws before a player has media, so every call site
tolerates it returning nothing.

This is the same rule as "resolve a playlist track by identity, not by index" applied
one layer down — to the buffer itself, which is the one place it had never been
applied. Startup already did it (`start()` compared the parked side's segment against
the store before promoting); the boundary did not.

**Never discard an `onError` from the inactive side.** `createPlayer`'s handler only
acted `if (side === activeSide.value)`, so an error about the *next* segment — the one
prewarming right now — was dropped on the floor. A dead buffer then looked exactly like
a ready one for the whole of the current segment, and the failure only became visible at
the boundary, as silence under the next chapter's titles. Record the failure on
whichever side reported it (`markSideFailed()`), clear its parked/prewarming flags, and
let the boundary's identity check route it to a fresh load. A cold load that errors must
also release the bounded wait it is holding, or the boundary sits on its timeout with the
outgoing segment stranded on air.

**A prewarm must be muted, not merely turned down.** `cueNext()` sets volume 0 before
`playVideo()`, but `cueVideoById` is processed asynchronously: a volume pushed before the
new media attaches can be reset when it lands, and the prewarm of the *next* segment
becomes audible underneath the current one — the second half of that same report. Use
`mute()`, a latch independent of volume that survives the video change, and lift it on
every path that puts a side on air (`startIncoming()`, the cold load, and `start()`).
Miss one and the whole show plays to a silent room. A test double that folds `mute()`
into `volume` cannot tell those two states apart, so model the latch separately and
assert an `audibleVolume`.

**Nothing may go to air before `start()`.** The cinematic buffers are built and
prewarmed by `prepare()` *during the Destiny intro*, minutes before the audience is
meant to hear anything from them. Every path that puts a segment on air — `beginSwap()`
and `skip()` — must therefore refuse to run while `started` is false. Without that
guard, a single `onError` from a prewarming buffer ran the whole boundary underneath
the intro: a song playing over the entire opening, which is what "there's a song playing
in my intro" was. Adding recovery to a boundary means adding a way for that boundary to
start audio, so the guard has to be added in the same change.

**Silence a buffer at readiness, not at its first cue.** A YouTube player is
constructed at full volume and unmuted, and both buffers are built during the intro,
so the gap between construction and the first `cueNext()` is a window in which the
cinematic can be heard under the intro. A real browser was observed sitting at volume
100, unmuted, in exactly that gap. Mute and zero each player in its `onReady`, before
anything is cued. A unit test cannot see this by checking state after `prepare()` —
`cueNext()` has already muted by then — so assert the *ordering*: `mute` must appear
before `cueVideoById` in the player's call log.

**A cold load is not yet on air.** `loadVideoById` autoplays, so the recovery load must
stay muted at volume 0 and be lifted only by `commit()`, at the moment the side actually
takes over. Unmuting at load time makes the incoming segment audible *underneath* the
outgoing one for the whole bounded wait. Put the `unMute()` in the shared `commit()`
closure, which both the warm and cold paths run, rather than in either path's setup.

**Both buffers prewarm.** Gating the prewarm on `side !== activeSide` left
Track 0 — the first thing the audience hears — as the only buffer that ever
entered cold, while a track needed seven minutes later was buffered eagerly. The
trailer's audio stopped and the room sat in silence on a black overlay. Prewarm
both sides during the intro, and promote a parked buffer with `startIncoming()`
(seek to the authored opening frame, then play) instead of a cold
`loadVideoById`; the seek, not the load, is what makes album entry
deterministic. Startup itself never waits on the park — see "A prewarm is an
optimisation and must never become a gate" below.

**The fade for a boundary belongs to the INCOMING segment.** It is authored on
the same config record as `transitionLore`, which is per-incoming. Reading it
from the outgoing segment shifts every fade one boundary earlier and makes the
last segment's `crossfadeMs` dead config that can never be applied. Derive the
lead in `pollActiveTime()` and the ramp in `beginSwap()`/`skip()` from one
helper taking the target index, or the two drift apart again.

**Publish the outgoing clock for the whole swap.** Suppressing `updateTime()`
while `swapping` freezes the transport bar for up to 2.5s and then snaps it to
zero at `advanceSegment()`. Do not simply drop the guard: `activeSide` has
already flipped to the incoming buffer while `store.segmentIndex` still names
the outgoing segment, so reading the active side publishes the new track's
position against the old segment's identity. Hold a reference to the outgoing
side for the duration of the swap and read that.

**Bound every await that the show depends on.** `start()` awaiting `PLAYING`
with no timeout hangs the presentation on a black frame with nobody in the
booth. Bound it, fall back to pushing play and opening the poll loop, and clear
the timer on both normal resolution and `destroy()`.

**A player test double must have a running clock.** These defects were invisible
for the same reason: `FakePlayer.currentTime` only moved on `loadVideoById`, so
a runaway buffer's clock was frozen at 0 forever and every timing assertion was
vacuously true. Model the transport honestly — `tickClock()` advancing time and
firing `ENDED` at the boundary, `seekTo()`, and `playVideo()` restarting a
finished video from 0 the way YouTube does — and drive timers and player clocks
together from one helper. Fixing the double is what makes the runtime fixes
provable; do it first. See `src/tests/wolvesDualBufferPlayer.test.ts`.

The same blind spot existed in the browser mock, so there is now a runtime
harness that runs the clock against the real route, started against a dev server
on 127.0.0.1:5173: `node tests/wolves-buffer-parking.mjs`. It fails on a build
with an unparked prewarm buffer (both buffers `PLAYING`, both clocks in lockstep)
and passes when one is parked at `currentTime` 0 with volume 0. Two things to
know before writing another harness like it: `window.__wolvesDurations.skipIntro()`
is async, so returning its promise from `page.evaluate()` hangs the run, and
`window.__wolvesCinematic` never appears under a mocked player, so assert against
`window.__mockWolvesPlayers` instead of waiting for that hook.

**Every await on the way to first audio must be bounded, including the ones you
did not write.** `start()` carried a timeout on the `PLAYING` transition and was
still able to hang the show forever, because it did `await prepare()` first and
`prepare()` awaits `loadYoutubeIframeApi()` and player `onReady` — both unbounded.
`handleIntroComplete()` awaits `start()` and holds the intro overlay opaque until
it returns, so a stalled YouTube script is a permanent black screen in front of
the audience. Bound the *whole* prepare-and-start path, and on expiry tear down
partial players **and** invalidate the cached API-load promise
(`invalidateYoutubeIframeApiLoad()`): a retry that reuses a promise which never
settled cannot recover. A rejected prepare needs the same treatment as a timed-out
one — an exception thrown past `start()` is the same hang.

**A prewarm is an optimisation and must never become a gate.** Awaiting the active
side's park before requesting playback turned a *failed* prewarm into guaranteed
dead air: the show waited out the settle timeout before it even asked to play,
while the intro was already fading its audio out underneath. Let the prewarm settle
during the intro, where there are minutes of runway. At the handoff read the parked
flag once — parked, promote by seek; not parked, clear `prewarming` and play
immediately. Never wait. Clearing `prewarming` at startup is also the guard that
stops a park landing *late* from pausing and muting the show after the volume is
up.

**A cold skip must not fade out a transport that is working.** The warm path
promotes an already-parked buffer and can swap synchronously. The cold path
(backward or multi-segment jumps) hard-loads, so switching sides and ramping
before the incoming reports `PLAYING` fades a good player toward a black one. Hold
the outgoing side until the incoming plays, bounded, and size that bound against
the transition overlay's hold — the overlay is the only cover, and its hold is now
derived from the crossfade rather than a fixed 11 s, so it is much shorter than it
used to be.

## Resolve a playlist track by identity, not by index

The show is **seven musical parts**. `CINEMATIC_SEGMENTS`
(`src/config/wolves-cinematic.ts`) lines up 1:1 and in order with the first
seven authored tracks of `public/wolves-playlist.json`:

| segment index | chapter | id | playlist track |
|---|---|---|---|
| 0 | PART I | `seven-days-to-the-wolves` | 0 |
| 1 | PART II | `ghosts-in-the-mist` | 1 |
| 2 | PART III | `tonight-we-must-be-warriors` | 2 |
| 3 | PART IV | `not-your-monster` | 3 |
| 4 | PART V | `end-of-you` | 4 |
| 5 | PART VI | `soulbound` | 5 |
| 6 | PART VII | `last-ride-of-the-day` | 6 |

`CINEMATIC_AUTHORED_DURATIONS` in `src/stores/cinematic.ts` is
`[424, 347, 251, 384, 193, 234, 271]` for those segments in order.

**Index-based lookup is still wrong, and the alignment above is the reason it
looks safe.** The two lists agreed once before, then an automated change deleted
a segment (see the next section) and every consumer that addressed the playlist
by `segmentIndex` silently read the previous song's metadata. Nothing failed
loudly, because an index is always in range. The alignment is a property of the
current data, not an invariant — treat it as something that has already been
broken once and can be broken again.

Three shipped defects came from indexing the playlist by segment index:

- `CINEMATIC_AUTHORED_DURATIONS` kept the deleted track's runtime and shifted
  every later part, so Parts V and VI carried the wrong values (193/234 instead
  of 234/271). Because `authoredSequenceElapsed()` **clamps** `segmentElapsed`
  to the authored value, the transport's TOTAL readout froze for the last 41 s
  of one part and the last 37 s of the finale, and overall duration
  under-reported by 78 s.
- `WolvesComicReader.vue` read `manifest.tracks[props.trackIndex]` and paced the
  174 BPM finale on Soulbound's 124 BPM grid, with the wrong crossfade.
- The same shape has been fixed three separate times in this repository.

The rule: **anything that reaches into the playlist resolves by identity.**
`TheaterExperience.vue` passes `:track-id="store.segment.youtubeId"` and the
reader matches on `youtubeVideoId`/`id`. Identity resolution is confined to the
Wolves experience on purpose — catalogue albums in
`public/experiences/catalogue.json` share youtube ids with unrelated entries
further down the same playlist, so for them the index *is* the addressing
scheme. `trackIndex` keeps driving ordering and branching (`trackIndex === 0`,
`trackIndex > 0`, shuffle partitioning); only the metadata lookup changed.

Rules:

- Never slice the playlist to build per-segment data. Read the ids out of
  `CINEMATIC_SEGMENTS` in order and measure those:
  `yt-dlp --skip-download --print "%(duration)s" <id> ...`.
- Durations are **measured**, never rounded guesses. A suspiciously round number
  is an authored guess; record the measuring command next to the data.
- One elapsed-time source. `advanceSegment()` used to accrue `completedElapsed`
  from the *player-reported* duration while `sequenceElapsed` summed the
  *authored* timeline, so the two readouts could disagree mid-show. Both now
  read `CINEMATIC_TIMELINE`.
- Guard the alignment in a test, not by eye: assert the authored duration array
  matches `CINEMATIC_SEGMENTS` by length and by id/`youtubeId` order, and assert
  the segment count and id order against `public/wolves-playlist.json` itself.

## A gap in an authored sequence is evidence of a deletion

The most expensive Wolves defect so far was not a race or a clock: **the show
was missing an entire song, and nobody noticed for a long time.** A change
justified as removing an *ending* segment deleted a **middle** segment —
`end-of-you`, then PART V — together with its authored `TRANSITION_FOUR` lore,
its team-chat entry, and its tests, and renumbered the surviving chapters down.
The loss then propagated quietly: `CINEMATIC_AUTHORED_DURATIONS`, a **derived**
array, kept the deleted track's runtime in place and shifted every value after
it, and later readers rationalised the resulting mismatch as deliberate
curation and wrote it down as a permanent trap.

How to catch this class of loss:

- **A gap in an authored sequence is evidence of a deletion, not a style.** The
  surviving tell sat in the config: `TRANSITION_FIVE` assigned to Soulbound
  with no `TRANSITION_FOUR` anywhere in the file. Authored constants numbered
  ONE, TWO, THREE, FIVE mean FOUR was removed. The same goes for chapter labels
  that stop short of the known part count, and for ids present in the playlist
  but absent from the segment list.
- **Count against the authored source, not the code.** `CINEMATIC_SEGMENTS`
  cannot vouch for itself. Verify the segment count and id order against
  `public/wolves-playlist.json`, which is the authored manifest.
- **Derived arrays do not shrink when their source does.** Any hand-maintained
  array that parallels a list — durations, BPM grids, chat keys — must be
  asserted against that list by id, or a deletion at position *n* silently
  re-labels everything after *n*.
- **Distrust a removal whose justification does not match its diff.** "Extra
  ending segment" removing a middle entry, renumbering survivors, and dropping
  authored lore is three separate content losses in one change. Authored content
  is never removed to make code tidier; if a change deletes authored prose,
  lore, or a track, it needs the owner's explicit word.
