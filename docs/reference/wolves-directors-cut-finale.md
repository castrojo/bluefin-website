# The Director's Cut finale

The last 68.8 seconds of Track 0 — `355.219 s` to the end of the segment at
`424 s` — are performed by one component, `WolvesDirectorFinale.vue`, over
anchors defined in `src/data/wolves-directors-cut-finale.ts` and re-exported
from `src/data/wolves-directors-cut-timeline.ts`. The cut does not stop there:
the finale's terminal black is the handoff into the Europa intro (see
[`wolves-video-order.md`](wolves-video-order.md)).

Read this before changing anything in that window.

## Nothing in the finale owns a clock

Every beat is a pure function of `store.nativeTime`, the time the soundtrack
player publishes. The finale never runs a timer, never counts frames, and never
asks the companion video what time it is except to detect drift. That is not
style: it is the only reason seeking backward out of the finale restores the
show. There is no latched state to unwind, so `directorFinaleActive` simply
becomes false and every suppressed surface comes back at once.

The one exception is deliberate and documented below: the terminal fade is a
latched CSS transition, because the final `PRE_END_THRESHOLD_S` of a segment is
not an animation clock.

## The anchors, and why each is where it is

All fifteen are exact entries of `TRACK_ZERO_BEAT_TIMES`. A round number in this
window is a defect.

| Anchor | Second | Beat | Why here |
|---|---|---|---|
| `bulletinStart` | 327.587 | 809 | Forty bars before the companion starts rolling. The seven-page bulletin opens against the build, so its full reading window is complete before the impact reveal. |
| `companionPrearm` | 344.956 | 853 | `TRACK_ZERO_SECTIONS.pivotalStart`. The companion player is built, cued, muted and parked 10.263 s before the cover and 46.184 s before the reveal. The bulletin is already on stage in the lore column. |
| `coverStart`, `collapseDayStart` | 355.219 | 879 | `DIRECTORS_CUT_FINALE_START` = `TRACK_ZERO_SECTIONS.bkEnd`. The ordinary schedule ends here and the Collapse day plate takes the frame. |
| `companionPlayStart`, `bulletinEnd` | 390.745 | 969 | The companion starts rolling **hidden**, one measured beat of lead, so the reveal is never a cold frame. The bulletin clears on the same beat, leaving the impact window empty beside the player. |
| `companionReveal` | 391.140 | 970 | The corner appears exactly as the source's measured impact cut lands. |
| `companionEnd`, `collapseNightEnd`, `extinctionStart` | 408.137 | 1013 | `TRACK_ZERO_SECTIONS.finaleStart`, the Become Legend cue. The corner (black since 407.765) is parked and cleared, the night plate is fully up, and the first clause takes the empty frame. |
| `extinctionFadeStart` | 412.433 | 1024 | 4.296 s of hold, while the music is still at full power. |
| `extinctionEnd` | 413.617 | 1027 | 1.184 s of fade; the clause is completely gone. |
| `survivalStart` | 414.407 | 1029 | 0.790 s of empty frame, so the two clauses are never on stage together. |
| `terminalFadeStart` | 419.933 | 1043 | The ring-out is down to 2% of the track's peak RMS. |
| `terminalFadeEnd` | 422.301 | 1049 | The last measured beat. Black is reached 1.699 s before the segment ends. |

## The companion video is measured, not guessed

The corner plays the **second** entry of `TRACKZERO_SIDECAR_VIDEO_IDS`,
`PjryN2F6fF0` ("Last Day of the Cretaceous: 'Prehistoric Planet' fan tribute",
3840x2160, 24 fps, 270.458 s), addressed by index so the finale and the standard
Track 0 sidecar can never disagree about which upload it is.

Its frames were taken from a **full decode of the source from frame 0** at
160x90 grayscale, flagging every frame whose mean absolute difference from its
predecessor exceeds 40/255. Decoding after a fast seek (`ffmpeg -ss` before
`-i`) offsets every timestamp by up to a GOP — on this source, by 0.208 s, which
is five frames and enough to put the impact on the wrong beat.

| Source second | Frame |
|---|---|
| 252.917 | cut to the asteroid impact: the aerial blast and its shock ring |
| 254.083 | cut away from the blast |
| 258.958 | last cut of the film: Earth seen from space |
| 259.833 | the impact flash appears on the limb |
| 266.458 | the source's own fade to black begins |
| 269.542 | first fully black frame (max luma 1) |
| 270.458 | end of file |

The played window is `[252.522, 269.914]`: parked one beat before the blast,
running through both impacts, reaching the source's own black at show time
407.765 — before the corner is cleared — and never touching the end of the file,
where YouTube would paint an end screen.

The show side is anchored twice over. The blast lands on beat 970, and the
source's own black lands 0.372 s before the Become Legend cue. Everything
between is the film's own edit, not ours.

## A dead companion paints nothing

The corner is a lit frame — opaque black fill, a blue ring, a drop shadow. An
empty one held for the 17 s reveal window reads from the back row as a broken
slide, so companion availability is **reactive state ANDed into visibility**,
not a side note. `companionUnavailable` is set on every failure path — the
shared API loader rejecting, no player constructor or host, and the embed's own
`onError`, whenever it arrives — and the corner is `display: none` from that
moment. The Collapse frame, the bulletin and the closing quote play on.

Teardown is identity-guarded, because `YT.Player.destroy()` is not idempotent
and the same instance is reachable from two places at once:

- the player the finale is holding **is** the memoised build result, so an
  unmount that destroys both destroys one player twice — a throw inside
  YouTube's own teardown, on every backward seek across the pre-arm anchor;
- `onError` can fire from **inside** `new YT.Player(...)`, before the expression
  returns and before anything can hold the instance — which is already a live
  iframe, a window message listener and a media element. The constructor's own
  return finishes the teardown the handler could not.

Both are pinned by per-instance destroy counting in
`src/tests/wolvesDirectorsCutFinaleStage.test.ts`; aggregate call counts cannot
tell "two players destroyed once" from "one player destroyed twice".

## Track 0's outro is measured too

From the same `track0.m4a` the beat grid came from (librosa 0.11, 22050 Hz, hop
512): full power holds to ~412.8 s; the ring-out falls to 50% of peak RMS at
413.9, 10% at 417.7, 2% at 419.4, and is silent from ~422.7. The last onset peak
is 405.722 and the last measured beat is 422.301.

That is why the terminal fade starts at 419.933 and ends at 422.301: the picture
goes out with the sound, not before it and not after the track has already
stopped.

## The terminal fade completes from Track 0's own clock, never from a tick

The transport stops publishing time in the last `PRE_END_THRESHOLD_S` (0.3 s) of
a segment, and a YouTube clock routinely plateaus before that anyway. A fade
computed per tick as `(time - start) / span` freezes half-way and leaves the show
sitting on a grey frame in front of the room.

So the fade is a **latched CSS transition**: one boolean crossing at
`terminalFadeStart` applies a class, and the compositor finishes it with no
further clock involvement. `store.directorTerminalBlack` then pins the frame
black. It is derived from Track 0's own published time reaching
`terminalFadeEnd` (422.301 s) — a tick that always arrives, because the anchor
is authored 1.699 s before the 424 s segment ends, ahead of the final
`PRE_END_THRESHOLD_S` the transport never publishes. It deliberately does not
read `store.finished`: `finish()` belongs to the experience's last segment,
which is no longer Track 0.

The transport itself is untouched, and the show does not stop at Track 0: the
Europa intro (`DIRECTORS_CUT_EUROPA_INTRO_SEGMENT`) follows with
`crossfadeMs: 0`, hitting the instant the terminal black lands — the piece
opens on its own fade up, so crossfading would dissolve one black frame into
another and read as a stall. No loop, no return to the lobby.

## Chrome suppression is store state, consumed in three places

`directorFinalePrearmed`, `directorFinaleActive` and `directorTerminalBlack` are
getters on the cinematic store, derived from `presentationProfile`, the
cinematic phase, the Track 0 segment being on air, and `nativeTime`. Three
surfaces consume them:

- `WolvesApp.vue` — the media widget,
- `CinematicStage.vue` — the nameplate, the captions, and the mount of the
  finale itself,
- `TheaterExperience.vue` — the theater grid and the standard Track 0 sidecar.

Deriving it once is what makes a backward seek restore all of them together. A
component that latched its own "the finale started" flag would have to be told
to unwind, and one of them would eventually not be.

`CinematicCaptions` does not render during Track 0 of either cut anyway (Track 0
ships no caption track), so its gate is proved by
`src/tests/wolvesDirectorsCutFinaleStage.test.ts` rather than by a browser.

## Seeking after the show has finished needs the poll loop back

`useDualBufferPlayer` stops polling when the final segment finishes. Without
restarting it on `seekTo`/`seekToRatio`, the store's clock stays pinned at the
end after a backward seek and nothing derived from published time — the finale's
chrome suppression, the transport readout — ever comes back.

## The closing quote

> Extinction is the rule. Survival is the exception.

Carl Sagan, *The Varieties of Scientific Experience: A Personal View of the
Search for God* (Penguin, 2006), ch. 3, p. 66.

It is **not** from *Cosmos*, which is where it is usually misattributed. The two
clauses are shown alone, one at a time, so the citation is published to the DOM
as `data-quote-source` rather than painted over the frame, and
`src/tests/wolvesDirectorsCutFinale.test.ts` fails if the citation ever names
*Cosmos*.

The missing-scientist bulletin (`blue-universal-acquires-wayland-yutani`) owns
327.587-390.745: 63.158 s for seven authored pages whose measured reading cost
is 59.5 s. It starts before the finale pre-arm and is carried into the finale
with the same `(duration, elapsed)` clock, so the handoff cannot re-page the
record. The full page window ends on `companionPlayStart`; the last page has
already been read, and clearing there leaves the impact and closing quote free
of a stale news panel.
