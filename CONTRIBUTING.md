# Contributing

## Boundary

The canonical content/design boundary lives in [`AGENTS.md`](AGENTS.md).

## Setup

```bash
npm install --include=dev
npm run dev
```

Read `AGENTS.md` and `docs/SKILL.md` before editing. Read the source file
that owns the requested content.

## Checks

Documentation-only changes:

```bash
git diff --check
```

Content or data changes:

```bash
npm run typecheck
npm run test:gate
npm run build
```

`npm run test:gate` is the test signal, not `npm run test:run`: the suite
carries a recorded baseline of known failures in `tests/known-failures.txt` and
the gate fails only on new ones. The standalone browser harnesses under
`tests/*.mjs` (for example `tests/wolves-movie-flow.mjs` and
`tests/wolves-transition-chat.mjs`) need a running dev server and are not part
of the gate.

Code or runtime changes require explicit design or engineering approval and the
full relevant validation workflow.

## Git and production handoff

Use a Conventional Commit. Stage explicit paths only. Do not use `git add .` or
`git add -A`. Do not modify, restore, or commit unrelated dirty files.

AI-assisted commits carry both attribution trailers required by the factory
contract (`projectbluefin/common` `docs/skills/human-gates.md`):

```
Assisted-by: <Model> via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

Name the model and tool actually driving the session; this repo's history uses
`via GitHub Copilot CLI` (see `AGENTS.md` under "Commit attribution").
`Co-authored-by` alone does not satisfy the factory contract.

The production remote is `upstream` (`projectbluefin/website`). Check remotes
before pushing; remove an accidental fork remote rather than pushing production
work to it.

Before reporting completion, follow `docs/skills/validation/SKILL.md`. A local
build does not prove deployment; verify the exact pushed commit's deployment run
and then check the live URL. Use `/var/tmp/website-agent/` for temporary logs and
screenshots; do not use `/tmp`.
