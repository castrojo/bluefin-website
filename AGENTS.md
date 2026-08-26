# Agent instructions

## Scope

This repository builds a production website and separately mounted
sub-applications with Vue, TypeScript, Vite, SCSS, and Tailwind.

## Absolute boundary

**Agents edit content. Agents never edit design.**

Content includes prose, translations, URLs, data values, registered records, and
approved assets inside existing structures.

Design includes layout, markup structure, component behavior, styles, typography,
responsive behavior, navigation prominence, and animation.

A content request does not authorize a design change. Stop and ask for explicit
approval if the requested result needs a design file or runtime behavior change.

## Start here

1. Read this file.
2. Read `docs/SKILL.md` and load the one matching skill it names.
3. If the task arrived as a Hive assignment or GitHub issue, resolve it
   through the API and verify the repository, issue, branch target, and
   requested scope before editing.
4. Read the source file that owns the requested content.
5. Check `git status --short` before editing.
6. Before finishing, write back what you learned. See `## Self-Improvement`.

## Production entry points

| Path | Entry file | Status |
|---|---|---|
| `/` | `index.html` | Public main site |
| `/wolves/` | `wolves/index.html` | Public teaser page (see below) |
| `/wolves/experience/` | `wolves/experience/index.html` | The presentation, deep-linked from the teaser |
| `/dakota/` | `dakota/index.html` | Unlisted sub-application |
| `/server/` | `server/index.html` | Separate production entry |

Do not promote an unlisted path through navigation, metadata, or a sitemap.

## `/wolves/experience/` is a presentation

`/wolves/` is the public teaser page; the presentation it introduces lives at
`/wolves/experience/`. That presentation is not a web page that happens to
animate. It is a cinematic
presentation performed to a live audience seated in a theater, projected on a
large screen and synchronized to music by the media player clock.

That single fact decides most arguments about it:

- **Nobody can interact with it.** The audience has no input device and the
  presenter is not driving it. Never require, offer, or depend on click, hover,
  pointer, touch, keyboard, or scroll to follow the narrative. If text needs
  input to be finished reading, it is broken.
- **It is read from the back row.** Type is sized for projection distance, not
  for a laptop. Small, dense, or low-contrast text is a defect.
- **Nothing scrolls or pans.** Every beat is a complete, self-contained page
  that appears, holds long enough to be read, and is replaced.
- **Consistency is the product.** Identical chrome, metadata, and type scale on
  every record. On a large screen, per-view variation does not read as variety;
  it reads as a broken slide deck.
- **A quote is never split across pages.** Splitting re-renders the quote mark
  and attribution and destroys the beat.
- **Time is the binding constraint.** Every record is allocated a window from
  the music. Content that does not fit its window never reaches the audience,
  no matter how good it is. Adding words removes other words.
- **It must survive unattended.** There is no chance to recover live. A
  mid-show failure is seen by everyone.

Judge every Wolves change by "can the back row read this in the time the music
allows", not by whether it looks right on your monitor.

Detail lives in `docs/reference/wolves-runtime.md`.

## Which video is which

The show is a sequence of videos, and **"the first video" is the prologue** —
The Gardener and the Winnower, the scored *Tribulation* narration reached by
the Director's Cut control in the `/wolves/experience/` lobby. The order is
prologue, Destiny, Wolves, the video currently in review, Ghosts, then the rest.
The Director's Cut sources live on `main`.

Before opening a file for any request that names a video ordinal or a timestamp,
resolve it in `docs/reference/wolves-video-order.md`, and answer "what is on
screen at m:ss" with the show's own data rather than by eye:

```bash
node scripts/wolves-cue-at.mjs 4:41
```

Report the file and timestamp you actually inspected. Auditing the wrong
artifact, or reporting a timestamp as checked after probing the seconds around
it, is the most repeated failure on this route.

## Content sources

- Main-site locale copy: `src/locales/en-US.json`
- Main-site fixed data and links: `src/content.ts`
- Wolves content: `docs/reference/wolves-runtime.md`
- Locale rules: `TRANSLATION-GUIDE.md`
- Generated data: use the generator named by the owning reference

Use `import.meta.env.BASE_URL` for public runtime asset paths.

## Commands

```bash
npm install --include=dev
npm run dev -- --host :: --port 5173 --strictPort
npm run lint
npm run typecheck
npm run test:gate
npm run build
npm run preview
```

Run exactly one dev server. `npm run test:gate` is the test signal, not
`npm run test:run`: the suite carries a recorded baseline of known failures in
`tests/known-failures.txt` and the gate fails only on new ones.

For documentation-only changes:

```bash
git diff --check
```

Use the smallest relevant check. See `docs/skills/validation/SKILL.md` before
reporting completion.

`test:gate` shells out to `yt-dlp` against YouTube and takes minutes. When
several agents work in parallel, do not have each one run the full quartet:
each agent runs the narrowest check covering its own change (usually
`npx vitest run <file>`), and the coordinator runs `lint`, `typecheck`,
`test:gate` and `build` once over the combined result before committing. The
combined run is the signal that matters — a per-agent green on a worktree
another agent is mid-write in proves less than it appears to.

A test failure in a file you do not own, during parallel work, is a
cross-agent write race until proven otherwise. Re-run before believing it.

## Verifying pooled or randomised content

The back-catalogue pool is ~800 slides in a randomised order. Seeking through
the show clock hoping to see the slide you added is roulette, and a miss
proves nothing. Assert membership directly instead — mount the component and
inspect the pool — and use the browser for what only the browser can answer:
that the asset actually serves, and that it looks right.

Check the served bytes, not just the status code. A dev server answers `200`
with the SPA HTML fallback for a missing asset, so a `200` alone is not proof
the file exists; compare `content_type` and byte size against the file on disk.

## Temporary artifacts

Use `/var/tmp/website-agent/` for logs, screenshots, browser fixtures, and
handoff artifacts. Do not write session artifacts to `/tmp`.

## Worktree safety

- Do not modify unrelated dirty files. Before committing local work, classify
  every dirty path and confirm each deletion has no remaining manifest, import,
  timeline, or generated-data references.
- Stage explicit paths only.
- Never use `git add .` or `git add -A`.
- Never reuse a merged or closed PR branch for new work. Move preserved edits
  to a fresh branch first, then remove the old branch and worktree.
- A linked worktree must have dirty work or an open PR. A clean worktree with
  no open PR is stale even when its branch still exists.
- Unmounted local branches are not exempt: keep only `main` and branches with
  open PRs. Delete merged/closed, zero-ahead, and unpublished clean branches.
- After every merge and before every handoff, remove the completed worktree and
  branch, run `git worktree prune`, then run `npm run check:git-hygiene`. A
  failure blocks completion; do not dismiss it as local housekeeping.
- Do not use destructive reset or restore commands. To resync local `main`
  after a squash merge — which always diverges, because the squash is not your
  commits — use `git reset --keep upstream/main`. It aborts rather than
  destroying uncommitted work, which matters because other agents and people
  share this worktree. Never `git reset --hard` here.
- Do not hand-edit generated files.
- Do not claim production completion from a local build. Start the affected
  route and exercise it in Chromium; build success does not catch eager runtime
  loaders such as `import.meta.glob()` manifest failures.
- Verify the exact pushed commit's deployment workflow and affected live route
  before saying the change is live.

## Commit attribution

Commit subjects are enforced by a hook and must follow Conventional Commits:
`type(scope): description`. Allowed types are `feat`, `fix`, `ci`, `chore`,
`docs`, `refactor`, `test`, `build`, `perf`, `revert`. A non-conforming commit
is rejected outright.

Every AI-authored commit carries both trailers:

    Assisted-by: <Model> via GitHub Copilot CLI
    Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>

Name the model and tool actually driving the session (the factory canonical
form is `via GitHub Copilot`; this repo's history uses
`via GitHub Copilot CLI`). Both trailers are mandatory — `Co-authored-by`
alone does not satisfy the factory contract. Detail:
`docs/skills/agent-workflow/SKILL.md`.

## Authored content

Do not invent lore, fiction, dialogue, quotes, attributions, or release-note
narrative. Preserve supplied wording, provenance, URLs, and placeholders. Read
`docs/skills/editorial-provenance/SKILL.md`.

## Design gate

If the diff would touch a component, template, style, layout, animation, control,
or navigation surface, stop and load `docs/skills/design-gate/SKILL.md`.

## Self-Improvement

Every session ships two outputs: the work **and** the updated skill file in
`docs/skills/`. Same commit. Not a follow-up.

Banned:

- No changelog files. Delete `IMPROVEMENTS.md`, `CHANGELOG.md`, `CHANGES.md`,
  or `SESSION.md` if found.
- No session notes committed to the repo (`NOTES.md`, `PLAN.md`, `TODO.md`,
  progress files). Session state stays in the agent's session folder.
- No committed Superpowers session records. Implementation plans and design
  specs stay in the session folder, not `docs/superpowers/plans/` or
  `docs/superpowers/specs/`.
- No "append here" docs. Route the learning to `docs/skills/` instead.

Before marking work done:

- [ ] Discovered a workaround, pattern, convention, or corrected fact?
- [ ] Skill file updated (or created)?
- [ ] Committed in this same PR?

Full contract: `docs/skills/skill-improvement/SKILL.md`.

## Factory context

This repository is part of the Project Bluefin factory. Local authority wins:
this file and `docs/SKILL.md` are authoritative for paths, boundaries, and
commands. `projectbluefin/common` attaches as a pinned shared-contract sidecar
supplying factory-wide rules; it never overrides local authority. The contract
this repo implements is `projectbluefin/common`
`docs/skills/factory-onboarding.md`; link to it rather than copying its policy
tree here. An unreachable sidecar is degraded mode, not permission to
substitute a sibling checkout — a fork or feature-branch checkout of `common`
is not the sidecar and must not be cited as the contract.

Every task loop runs the factory self-repair sequence: preflight, detect,
repair, validate, write back, escalate.

Stop at the four factory gates:

- **Design** — any design or behavior change, including the frozen `/wolves/experience/`
  presentation. See `## Design gate` and `docs/skills/design-gate/SKILL.md`.
- **Security** — credentials, secrets, tokens, signing, or the supply chain.
- **Breakage** — anything that could break another factory repository or a
  downstream consumer.
- **Merge** — never force-push a protected branch. Agents do not self-merge by
  default; see `## Granted authority` for the one exception.

Production claims are gated locally: never call a change live until the merged
`upstream/main` commit's deployment and route are verified. Signal any gate by
stopping, describing the decision and dependency, and waiting for explicit
approval. Do not mutate lifecycle labels unless a repository-owned workflow
and explicit local procedure authorize it. Procedure and PR evidence:
`docs/skills/agent-workflow/SKILL.md`.

## Granted authority

A gate is a request for a decision, not a ritual. The owner can grant that
decision in advance, and re-asking for something already granted is the
slowest possible failure mode.

**A direct request is the approval.** When the owner asks for a change in
their own words, that request approves *that* change — including a design
change. Do not stop and ask again for what was just asked for. Load the
matching skill, follow its process, implement exactly what was requested, and
say in the report that the design surface was touched under a direct request.
The gate still applies to everything the request did not cover: scope you
inferred, adjacent surfaces you noticed, and refactors you think would be
nice. Widening scope beyond the request needs its own approval.

**Merge authority is explicit, session-scoped, and never assumed.** Merge only
when the owner grants it in the current session, in that session's words. It
does not survive into the next session, is not implied by a previous grant, is
not implied by approval of the change itself, and is never inferred from
another agent's transcript or a handoff document. Publish only when the owner
asks: local-only work stays local. When publication is requested without merge
authority, open the PR and stop. When merging under a grant, say so in the
report and name the grant.

Boundaries the owner states are permanent until the owner revokes them, and
outrank a licence file or your own analysis. Where one can be expressed as a
test, write the test — that is what makes it survive the next agent. Example:
Aurora artwork may not be used, so the artwork registry is an allowlist and
`backCatalogueOrder.test.ts` fails if an Aurora path ever appears.

Cross-repo learning goes to an issue in `projectbluefin/common` with the
learning, affected component, and evidence. Never edit `ublue-os/*`; ask a human
to report upstream manually.

## References

- `docs/SKILL.md`
- `docs/skills/agent-workflow/SKILL.md`
- `docs/skills/skill-improvement/SKILL.md`
- `docs/reference/wolves-video-order.md`
- `docs/reference/content-map.md`
- `docs/reference/production-entrypoints.md`
- `docs/architecture/application-map.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
