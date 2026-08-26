---
name: skill-improvement
description: Use before marking any task done, to decide what durable learning to write back and which skill file owns it.
---

# Skill improvement

## Overview

Every agent session produces two outputs:

1. **The work** — the content change, fix, or PR.
2. **The learning** — what the next agent needs to know.

Output 1 without output 2 leaves this repository no smarter. The learning goes
in `docs/skills/`, in the **same commit** as the work, never as a follow-up.

## When to Use

Use before reporting completion, opening a PR, or handing off a session —
including sessions that succeeded on the first try.

## When NOT to Use

Do not use to record session state, task progress, current status, issue
ledgers, or one-off instructions. Those live in the agent's session folder and
are never committed.

## Core Process

1. **Preflight.** Verify the repository, remote, branch, and which skills you
   loaded against source before editing.
2. **Detect.** Treat stale, contradictory, missing, or failed guidance as a
   repair signal. Do not silently work around a wrong skill.
3. **Repair.** Update the closest owning skill when the fix is source-backed
   and in scope. Prefer editing an existing skill over creating a new one.
4. **Validate.** Run the smallest relevant check from
   [`../validation/SKILL.md`](../validation/SKILL.md), including
   `npm run check:docs` for any documentation change.
5. **Write back.** Commit the skill update with the work, staging explicit
   paths only.
6. **Escalate.** Stop for design changes, production claims, credentials, or
   cross-repository breakage. Autonomy repairs known failures; it does not
   manufacture approval.

## What to write back

Write it:

| Category | Example |
|---|---|
| Non-obvious correctness requirement | A route loads its manifest eagerly, so a successful build does not prove it initializes. |
| Convention not visible in the code | A content surface is generated, so the generator is the edit point rather than the output file. |
| Trial-and-error discovery | A verification step that only works in a real browser at a specific viewport. |
| Project-internal fact correction | A production entry point, remote, or deployment workflow that differs from what a previous doc claimed. |

Do not write:

| Category | Example |
|---|---|
| One-off task note | The commit message to use for this specific change. |
| Obvious developer knowledge | How to read `git status`. |
| Ephemeral state | Which branch is currently in review. |
| Contradiction of another skill | If a skill is wrong, correct that skill instead of adding a competing doc. |

Any skill stating a project-internal fact must carry a `## Verification`
section with the command that re-derives that fact from source.

## Which file owns it

| Changed area | Update |
|---|---|
| Prose, locale copy, links, data values | [`../content-maintenance/SKILL.md`](../content-maintenance/SKILL.md) |
| Approved design, layout, or component work | [`../design-gate/SKILL.md`](../design-gate/SKILL.md) |
| Lore, quotes, attribution, provenance | [`../editorial-provenance/SKILL.md`](../editorial-provenance/SKILL.md) |
| Checks, staging, deployment, live status | [`../validation/SKILL.md`](../validation/SKILL.md) |
| Session routing, remotes, handoff | [`../agent-workflow/SKILL.md`](../agent-workflow/SKILL.md) |
| DNS, Workers, Pages, Wrangler | [`../cloudflare/SKILL.md`](../cloudflare/SKILL.md) |
| Wolves content, cards, or approved runtime work | the matching `wolves-*` or `guardian-*` skill |
| A genuinely new reusable domain | a new skill, per [`../skill-authoring/SKILL.md`](../skill-authoring/SKILL.md) |
| A fact affecting 2+ factory repos | this repo first, then an issue in `projectbluefin/common` |

Never edit `ublue-os/*`. Ask the human to report upstream manually.

## Banned artifacts

Delete these on sight; they collect stale text instead of updating skills.

- Changelog-style agent files: `IMPROVEMENTS.md`, `CHANGELOG.md`, `CHANGES.md`,
  `SESSION.md`.
- Committed session logs: `NOTES.md`, `PLAN.md`, `TODO.md`, progress files.
- Superpowers session records under `docs/superpowers/plans/` or
  `docs/superpowers/specs/`. Keep plans and design drafts in the agent session
  folder; durable rules belong in the owning skill.
- Any doc instructing an agent to "append here" — route to `docs/skills/`
  instead.

This does not ban product documentation or release notes owned by a human.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll write this up in a follow-up PR." | You will not, and the next agent pays for it. Same PR, or it does not exist. |
| "This was obvious once I saw it." | You found it by trial and error, which is the definition of not obvious. |
| "A new doc explains the correct behaviour." | Two docs that disagree are worse than one that is wrong. Correct the skill in place. |

## Red Flags

- A session ends with a shipped change and no skill update.
- The same failure is rediscovered in a later session.
- A workaround is used without recording why it was needed.
- A learning is deferred to a follow-up PR.
- A skill is contradicted by a new doc instead of being corrected.

## Verification

Before reporting completion:

- [ ] Did I discover a workaround, pattern, convention, or corrected fact?
- [ ] Does a skill already own that area?
- [ ] Did I update it, or create one when none existed?
- [ ] Is the skill update staged in this same commit?
- [ ] `npm run check:docs` passes.
- [ ] No banned artifact was added:

```bash
git ls-files 'IMPROVEMENTS.md' 'CHANGELOG.md' 'CHANGES.md' 'SESSION.md' 'NOTES.md' 'PLAN.md' 'TODO.md'
git ls-files 'docs/superpowers/plans/**' 'docs/superpowers/specs/**'
```

Both commands must return no output.

## References

- [`../../SKILL.md`](../../SKILL.md) — task→skill router.
- [`../skill-authoring/SKILL.md`](../skill-authoring/SKILL.md) — how to write a
  new skill.
- `projectbluefin/common` `docs/skills/factory-onboarding.md` — the factory
  contract this skill implements.
