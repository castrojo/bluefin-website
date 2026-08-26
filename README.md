# Website

This repository builds a production website and separately mounted
sub-applications with Vue 3, TypeScript, Vite, SCSS, and Tailwind.

## Boundary

Read [`AGENTS.md`](AGENTS.md) for the canonical repository boundary. Use
`docs/SKILL.md` to load only the workflow needed for the task.

## Production entries

| Path | Entry | Status |
|---|---|---|
| `/` | `index.html` | Public main site |
| `/wolves/` | `wolves/index.html` | Public teaser page |
| `/wolves/experience/` | `wolves/experience/index.html` | Public presentation |
| `/dakota/` | `dakota/index.html` | Unlisted |
| `/server/` | `server/index.html` | Separate entry |

## Local development

```bash
npm install --include=dev
npm run dev
```

Available checks:

```bash
npm run lint
npm run typecheck
npm run test:gate
npm run build
npm run preview
```

`npm run test:gate` is the test signal: it runs the suite against the recorded
baseline in `tests/known-failures.txt` and fails only on new failures. The
browser harnesses under `tests/*.mjs` need a running dev server and are not
part of the gate.

## Documentation

- `AGENTS.md`: agent entry point and repository boundaries.
- `docs/SKILL.md`: task→skill router for lazy-loaded workflows.
- `docs/reference/content-map.md`: production content sources.
- `docs/reference/wolves-runtime.md`: Wolves content and runtime boundaries.
- `CONTRIBUTING.md`: contributor workflow.
- `TRANSLATION-GUIDE.md`: locale editing rules.
- `SECURITY.md`: vulnerability reporting.
