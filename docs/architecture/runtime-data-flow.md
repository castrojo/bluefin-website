# Runtime data flow

Repository boundary: [`../../AGENTS.md`](../../AGENTS.md).

## Main site

`index.html` loads `src/main.ts`. `src/main.ts` mounts `src/App.vue`, installs
locale handling, and loads the shared stylesheet. Vue components render locale
values and fixed content data.

## Wolves

`wolves/experience/index.html` loads `src/wolves-main.ts`, which mounts
`src/WolvesApp.vue`; the teaser at `wolves/index.html` loads
`src/wolves-teaser-main.ts` (`src/WolvesTeaserApp.vue`). `src/WolvesApp.vue`
owns the presentation's runtime shell. `src/stores/cinematic.ts` owns phase and
playback state. The cinematic stage and intro publish clock state into the
store; transport and synchronized surfaces read that state.

The active media player's clock drives synchronized content. Do not add a second
clock or a second transport for a content change.

Playback runs on two YouTube buffers (`src/composables/useDualBufferPlayer.ts`):
one is on air while the other holds the next segment, prewarmed and parked. Two
invariants govern that pair, and both have shipped broken:

- **A buffer goes to air on verified identity, never on position.** The side's
  recorded `segmentIndex` is only what the runtime *asked* for; the player's real
  `getVideoData().video_id` is what the room will hear. Promoting on the record
  alone puts the wrong song under the segment the screen is naming.
- **Nothing goes to air before the show starts.** Both buffers are built and
  prewarmed during the intro, so every path that can begin playback is gated on
  `started`, and prewarms are muted until the moment they take over.

Detail and the defects behind them:
[`../reference/wolves-transport-and-clocks.md`](../reference/wolves-transport-and-clocks.md).

## Generated data

Generated files are outputs, not editing surfaces. Change their source data or
generator, then regenerate:

- `src/components/wolves/wallpapers-list.ts`
- `public/experiences/catalogue.json`
- `public/wolves-playlist.json`
- generated album artwork under `public/experiences/`

The owning reference in `docs/reference/` names the generator and validation.

## Lore timing and accessibility

The narrative timeline selects records from the active player clock. Unlocked lore intervals are allocated by content cost; locked anchors retain their authored windows. Quote and conversation renderers page off the same player clock and reading-cost model as the scheduler. The quote view exposes the complete quote at the article level for assistive technology rather than announcing each paged reveal. Never add a second clock or compensate for an undersized slot only by changing renderer speed.
