# Wolves video order

The show is a sequence of videos. Ordinals in this table are what "the first
video" means — nothing else in this repository defines that phrase, and agents
have repeatedly audited the wrong artifact because of it.

**When you are asked about "video N" or a timestamp, resolve it here first, then
say in your report which file and which timestamp you inspected.**

## Running order

Two shows share this table. The **standard show** at `/wolves/experience/` plays videos 3
and 5 onward — all seven authored soundtrack parts, unchanged. The **Director's
Cut** is a *fork* of it, not a re-edit: videos 1, 2, 3 and 4, keeping only 7 Days
to the Wolves, which the show is named for. Everything after that in the cut is
material authored for the cut. A legacy track appearing in the Director's Cut is
a defect, and `wolvesCinematicStores.test.ts` fails if one does.

| # | Video | What it is | Data owner | How to play it |
|---|---|---|---|---|
| 1 | **Prologue** — The Gardener and the Winnower | Scored narration over the approved Earth-devastation montage, ending on the Collapse, the Europa arrival and the title card. Silent narration, no dialogue. The track is *Excerpt from The Tribulation* (134.65 s) and it opens on an image, not on black. | `src/data/wolves-directors-cut-intro.ts` (`buildDirectorsCutPrologueSegment()`) | `/wolves/experience/` → the **Director's Cut** button |
| 2 | **Destiny** | The Ikora-voiced Destiny trailer the prologue hands off to. | `src/data/wolves-directors-cut-intro.ts` (`buildDirectorsCutDestinySegment()`) | continues from video 1 |
| 3 | **Wolves** — "7 Days to the Wolves" | The comic reader, the lore column and the thesis overlay, on the Nightwish track. Show Track 1; segment index 0. | `src/data/wolves-track-zero-*.ts`, `src/data/wolves-narrative-timeline.ts` | continues from video 2 |
| 4 | **Europa Intro** | A 95s interlude that closes the Director's Cut, published as a single upload because the finished film is a twelve-span edit across three sources that no start/end trim reproduces. Hits the instant Track 0's finale reaches black, with `crossfadeMs: 0` — the piece opens on its own fade up, so crossfading would dissolve one black frame into another and read as a stall. Deliberately **not** a member of `CINEMATIC_SEGMENTS`: that list is the authored seven-pillar soundtrack the standard show plays and every index into it is load-bearing. | `src/config/wolves-cinematic.ts` (`DIRECTORS_CUT_EUROPA_INTRO_SEGMENT`) | continues from video 3 |
| 5 | **Ghosts In The Mist** | First of the later authored tracks; opens on the Jorge Castro hero plate and its 48.4s quote sequence. Segment index 1. **Standard show only** — it was in the Director's Cut and was removed when the cut became a fork. | `src/config/wolves-cinematic.ts` | continues from video 3 in the standard show |
| 6+ | The rest | Tracks 3–7 in `CINEMATIC_SEGMENTS` order, on the curated Flickr gallery. | `src/config/wolves-cinematic.ts` | continue in order |

Ordinals here are **video numbering** and are a third scheme on top of the two in
[`wolves-runtime.md`](wolves-runtime.md) ("Later-track gallery policy"). They do
not line up:

- Video 1 and 2 are the Director's Cut intro; neither is a "track".
- Video 3 is show Track 1 and segment index 0.
- Video 4 is the Europa intro, which is a Director's Cut segment with **no**
  index into `CINEMATIC_SEGMENTS` at all, and is currently the last thing the
  Director's Cut plays.
- Video 5 is show Track 2 and segment index 1.

Say which scheme you mean every time a number could be read either way.

## Source ownership

`main` owns both shows. Director-specific intro data lives in
`wolves-directors-cut-intro.ts`; its finale data and component use the
`wolves-directors-cut-*` names; the shared Track 0 runtime remains under the
standard `wolves-*` modules. Branch names are not source authority and must not
be used to decide whether a video exists.

## What is on screen at a timestamp

Do not hand-simulate the mark grid, and do not screenshot nearby seconds and
infer. A probe that samples only nearby frames can step over the exact cue the
owner named and still report the timestamp as checked.

Ask the show:

```bash
node scripts/wolves-cue-at.mjs 1:50        # defaults to the prologue
node scripts/wolves-cue-at.mjs prologue 110
node scripts/wolves-cue-at.mjs prologue --all
```

It loads the authored modules through Vite, so it reads the same data the app
does and cannot drift from it. It reports the cue window, the exact text, its
word and line counts, the longest line, the emphasis, and whether the words are
still up at the second you asked about — a cue's *shot* outlives its *text*, so
"the shot contains 1:50" and "words are on screen at 1:50" are different
questions.

Only the prologue is registered so far. Add a video to the `VIDEOS` table in the
script when its data becomes addressable, rather than growing a second lookup.

## Reporting a timestamp defect

Quote the tool's output. A report that names a timestamp without the cue text at
that timestamp has not been verified, and this show has lost days to exactly
that.
