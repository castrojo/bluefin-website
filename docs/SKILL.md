# Website Skill Router

Agent entry point for `projectbluefin/website`. Find the skill that matches your
task, load only that skill, then act.

**Agents edit content. Agents never edit design.**

## Read order

1. [`AGENTS.md`](../AGENTS.md) — repo contract, boundaries, build commands.
2. This file — task→skill mapping.
3. The one skill file named in the table below.
4. The source file that owns the requested content.

Do not load every skill. Load the smallest skill that answers the job.

## Know what you are editing

`/` is a website. `/wolves/experience/` is a **presentation** performed to a
live audience seated in a theater, projected and synchronized to music, with no
interaction available to anyone. (`/wolves/` itself is the teaser page that
introduces it.) Web-page instincts — scroll it, shrink the type, add a
control, add more words — are defects there. Read `AGENTS.md` under
"`/wolves/experience/` is a presentation" before touching that route.

## Skill index

| I need to... | Load |
|---|---|
| Edit text, links, translations, data, or approved assets | [`content-maintenance/SKILL.md`](skills/content-maintenance/SKILL.md) |
| Edit SBOM extraction scripts, version comparison, or dakota-versions updater | [`sbom-version-extraction/SKILL.md`](skills/sbom-version-extraction/SKILL.md) |
| Change layout, styling, a component, animation, or navigation | [`design-gate/SKILL.md`](skills/design-gate/SKILL.md) |
| Handle lore, fiction, quotes, or attribution | [`editorial-provenance/SKILL.md`](skills/editorial-provenance/SKILL.md) |
| Run tests, builds, staging, deployment, or claim live status | [`validation/SKILL.md`](skills/validation/SKILL.md) |
| Route a session, set remotes, commit, signal a factory gate, or hand off production | [`agent-workflow/SKILL.md`](skills/agent-workflow/SKILL.md) |
| Work on Cloudflare DNS, Workers, Pages, domains, or Wrangler | [`cloudflare/SKILL.md`](skills/cloudflare/SKILL.md) |
| Edit Wolves content or assets | [`wolves-content/SKILL.md`](skills/wolves-content/SKILL.md) |
| Edit the `/wolves/` teaser, Trailer 1 player, plates, bridge, or end card | [`wolves-teaser/SKILL.md`](skills/wolves-teaser/SKILL.md) |
| Edit Wolves guardian cards, share pages, or lobby gallery data | [`guardian-character-cards/SKILL.md`](skills/guardian-character-cards/SKILL.md) |
| Do explicitly approved Wolves runtime engineering | [`wolves-runtime-engineering/SKILL.md`](skills/wolves-runtime-engineering/SKILL.md) |
| Write back what I learned before finishing | [`skill-improvement/SKILL.md`](skills/skill-improvement/SKILL.md) |
| Create, restructure, or retire a skill | [`skill-authoring/SKILL.md`](skills/skill-authoring/SKILL.md) |

This table is the single hand-curated router for this repository.
[`skills/INDEX.md`](skills/INDEX.md) points here; do not maintain a second table.

## How to load a skill

Read the skill's YAML front matter first. If `description` matches your task,
read the body. If a fact belongs to another skill or reference, follow the link
rather than duplicating it.

## Factory context

This repository is part of the Project Bluefin factory. Local authority wins:
`AGENTS.md` and this router are authoritative for paths, boundaries, and
commands. `projectbluefin/common` attaches as a pinned shared-contract sidecar
that supplies factory-wide rules; it never overrides local authority.

- Factory model and cross-repo rules: `projectbluefin/common`
  `docs/factory/agentic-model.md`
- Onboarding contract this repo implements: `projectbluefin/common`
  `docs/skills/factory-onboarding.md`
- Four human gates and PR evidence rules: `projectbluefin/common`
  `docs/skills/human-gates.md`
- Cross-repo learning: open an issue in `projectbluefin/common` with the
  learning, affected component, and evidence. Never edit `ublue-os/*`.

A missing or unreachable sidecar is degraded mode, not permission to substitute
a stale sibling checkout. A sibling checkout on a fork or a feature branch is
not the sidecar; fetch canonical `projectbluefin/common` `main` or proceed
without it.

## Every task loop

1. **Preflight** — verify repository, remote, branch, dirty paths, and the
   skill set you loaded. When the task arrives as a Hive assignment or GitHub
   issue, resolve it through the API and verify the repository, issue, branch
   target, and requested scope before editing.
2. **Detect** — treat stale, contradictory, missing, or failed guidance as a
   repair signal; do not silently fall back.
3. **Repair** — make the smallest scoped change inside the approved boundary.
4. **Validate** — run the smallest relevant check from
   [`skills/validation/SKILL.md`](skills/validation/SKILL.md).
5. **Write back** — update the skill that owns the area in the same commit.
   See [`skills/skill-improvement/SKILL.md`](skills/skill-improvement/SKILL.md).
6. **Escalate** — stop at the four factory gates (Design, Security, Breakage,
   Merge) or a production claim. See
   [`skills/agent-workflow/SKILL.md`](skills/agent-workflow/SKILL.md).

## Supporting references

Skills define procedures. References state current production facts. Keep those
roles separate.

- [`reference/content-map.md`](reference/content-map.md)
- [`reference/production-entrypoints.md`](reference/production-entrypoints.md)
- [`reference/locale-schema.md`](reference/locale-schema.md)
- [`reference/wolves-runtime.md`](reference/wolves-runtime.md)
- [`reference/wolves-transport-and-clocks.md`](reference/wolves-transport-and-clocks.md)
- [`reference/wolves-intro-and-overlay.md`](reference/wolves-intro-and-overlay.md)
- [`reference/wolves-lore-timing.md`](reference/wolves-lore-timing.md)
- [`reference/wolves-slide-scheduling.md`](reference/wolves-slide-scheduling.md)
- [`reference/wolves-test-harnesses.md`](reference/wolves-test-harnesses.md)
- [`architecture/application-map.md`](architecture/application-map.md)
- [`architecture/runtime-data-flow.md`](architecture/runtime-data-flow.md)
