# Validating the Wolves show

## Wolves timing validation

For lore timing work, run typecheck, focused lore/timing/timeline tests, build, diff check, and a Chromium smoke of /wolves/experience/. Report focused results separately from full-suite baseline failures. Assert a non-empty rendered body, zero page errors, no failed module requests, preserved locked anchors, contiguous unlocked slots, and readable representative short/long records.

## A green `test:gate` proves nothing about the Wolves show

`npm run test:gate` does **not** run `tests/wolves-movie-flow.mjs`. That harness is
a separate CI job (`wolves-movie-flow` in `.github/workflows/ci.yml`) which boots a
dev server and drives the real route. So the gate can be green, typecheck and lint
clean, the build succeed, and every production route render with zero `pageerror`
— while the show itself is broken.

That is not hypothetical. A change that was validated exactly that way shipped two
runtime defects: Part II opened on Part I's photo because the decode gate blocked
on a cold remote fetch, and the transport read "Play" during the intro because the
active buffer's prewarm park published `PAUSED` to the store. The harness caught
both immediately and deterministically. A route-renders smoke test caught neither,
because both defects render a perfectly valid-looking page.

**For any change to the Wolves runtime — player, store, transitions, slideshow,
intro overlay — run the harness before claiming the work is done:**

```bash
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort &
WOLVES_BROWSER_FIXTURES=1 node tests/wolves-movie-flow.mjs
```

Read the **`Results:` line, not the tail of the output.** Assertions run in show
order, so an early failure scrolls off the top; piping through `tail` hid a real
failure and made a 3-failure run look like 2. Compare the pass count against the
pre-change commit rather than against an absolute number — the count moves as
assertions are added. `git worktree add` a detached checkout of the base commit,
symlink `node_modules`, serve it on another port, and run the same harness against
`WOLVES_BASE_URL` to get an honest baseline.

Two failure modes to recognise before blaming your change:

- **Not every failure is flake.** The transport auto-hides after 3 s without
  pointer input, so `Visible Pause control` is the documented flaky assertion — but
  a *deterministic* 3-of-3 failure is a real defect, not flake. Re-run before
  concluding either way.
- **Your own instrumentation perturbs it.** Adding `waitForTimeout` to a probe copy
  will trip that same auto-hide assertion. Probe with a copy outside the repo, and
  re-confirm against the unmodified harness.

### The movie-flow harness is not the whole show either

It drives the cinematic, so it cannot see two things that have both shipped broken.
For any transport, buffer, or player change, also run:

```bash
node tests/wolves-buffer-parking.mjs     # no buffer running away underneath the show
node tests/wolves-ghosts-boundary.mjs    # the on-air buffer really holds the segment named on screen
node tests/wolves-intro-silence.mjs      # the cinematic stays silent under the intro
```

`wolves-intro-silence.mjs` exists because of a defect this skill's own checklist
missed: the cinematic buffers are prewarmed *during* the intro, a boundary ran in
that window, and a track played over the whole opening. Gate, typecheck, lint,
build, movie-flow, and a route smoke test were all green. **Validate the intro
window separately from the cinematic** — "the show is fine" is a claim about two
different phases.

The general lesson: if a change adds a way for the runtime to *start audio* or
*put something on air*, ask what stops that path running before the show has
started. Then check that phase, not just the one you were working in.

Lobby CTA edits need a lighter check: stub `WolvesCharacterGallery`,
`WolvesQrCodes`, and `WolvesBackCatalogue` in the component test, then verify
the teaser/button block still renders before the QR/back-catalogue stack and
measure its bounds in Chromium at fixed desktop and mobile viewports.

### These harnesses need real playback, and CI Chromium has none

Playwright's bundled Chromium ships without proprietary codecs, so YouTube answers
with error 150 and no media attaches. `wolves-ghosts-boundary.mjs` and
`wolves-intro-silence.mjs` are written to tolerate that — an *empty* buffer passes,
only a *wrong* or *audible* one fails — so they are still worth running locally, but
a clean run in that environment is weaker evidence than it looks. Neither is wired
into `.github/workflows/ci.yml`; only `wolves-movie-flow` is. Do not read a local
pass as proof that real audio is correct, and say so when reporting.

Two intro harnesses, `tests/wolves-intro-segments.mjs` and
`tests/wolves-intro-destiny-toggle.mjs`, **fail on `main`** in that environment.
Baseline them with a worktree before treating either as a regression.

### Probing the comic reader without Chrome DevTools MCP

When the chrome-devtools MCP has no browser (no Chrome stable on the box), drive
the repo's own `playwright` package from a script in `/var/tmp/website-agent/`
instead — do not install a browser. The working pattern:

- Copy the `window.YT.Player` mock `addInitScript` from
  `tests/wolves-movie-flow.mjs` (auto-advancing `getCurrentTime` via
  `performance.now`) and pin `Math.random = () => 0`; the app gates playback on
  the YT player, so without the mock nothing advances.
- From the lobby: click the first `.wc-back-catalogue-card` for a back-catalogue
  album (where portrait art and `kind: 'hero'` slides live); for the authored
  show click JOIN, then `__wolvesDurations.skipIntro()`, then
  `__wolvesCinematic.seekTo(seconds)` to land on a specific slide.
- The active crossfade layer is the one with `zIndex === 2`; read slide state
  from that layer, not from DOM order.
- Authored-show slide windows live in `src/data/wolves-track-zero-slides.ts` —
  seek inside a named window rather than guessing timestamps.

The mock depends on `page.addInitScript` running "after the document is created
but before any of its scripts are run" (verified against Context7
`/microsoft/playwright`), which is what lets it install `window.YT` and pin
`Math.random` ahead of app boot. Injecting the same stub after `goto` is too
late and the show never advances.

Two facts that bite when asserting on rendered slides:

- **Key per-image measurements by `photo.id`, never by URL.**
  `handleImageError` in `WolvesComicReader.vue` rewrites failing Flickr srcs
  through a fallback chain (`_b` → `_z` → plain → local png), so the rendered
  `<img>` URL can diverge from the preloaded URL; URL-keyed maps silently miss
  exactly the slides that needed fallback.
- **Character art is square RGBA, not portrait.** Everything in
  `public/characters/` measures ~1:1 (0.94–1.62) with an alpha silhouette, so a
  `naturalHeight > naturalWidth` "portrait" rule never fires for the dinosaurs —
  any orientation treatment must be `kind: 'hero'`-aware (see
  `src/utils/slide-showcase.ts`).

---

Procedure and gate: [`../SKILL.md`](../SKILL.md).
