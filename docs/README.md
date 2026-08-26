# Documentation map

## Start

- [`../AGENTS.md`](../AGENTS.md): canonical repository rules and boundaries.
- `SKILL.md`: task→skill router; choose one lazy-loaded workflow.
- `reference/content-map.md`: locate production content.
- `reference/production-entrypoints.md`: locate mounted applications.

## Two different products

This repository ships a **website** at `/`, a **teaser page** at `/wolves/`,
and a **presentation** at
`/wolves/experience/`. They have different rules. The presentation is performed
to a live
audience in theater seats, is read from a distance, is paced by music, and
cannot be interacted with. See `../AGENTS.md` under
"`/wolves/experience/` is a
presentation" and `reference/wolves-runtime.md`.

## Architecture

- `architecture/application-map.md`: production entry points and component areas.
- `architecture/runtime-data-flow.md`: state, media, and generated-data flow.

## Skills

Each skill lives in its own directory and starts at `SKILL.md`. Load supporting
references only when the selected skill links to them.

## References

Reference files state current production facts. Skills define procedures. Keep
those roles separate and update the canonical owner when source code changes.

The Wolves runtime detail is split into companion references, all reached from
`reference/wolves-runtime.md` and the router: `reference/wolves-transport-and-clocks.md`,
`reference/wolves-intro-and-overlay.md`, `reference/wolves-lore-timing.md`,
`reference/wolves-slide-scheduling.md`, and `reference/wolves-test-harnesses.md`.
Also on file: `reference/locale-schema.md` for locale value formats.
