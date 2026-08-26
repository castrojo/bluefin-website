# Application map

Repository boundary: [`../../AGENTS.md`](../../AGENTS.md).

## Production entries

| Path | Entry | Mount |
|---|---|---|
| `/` | `index.html` | `src/main.ts` -> `src/App.vue` |
| `/wolves/` | `wolves/index.html` | `src/wolves-teaser-main.ts` -> `src/WolvesTeaserApp.vue` |
| `/wolves/experience/` | `wolves/experience/index.html` | `src/wolves-main.ts` -> `src/WolvesApp.vue` |
| `/dakota/` | `dakota/index.html` | `src/dakota-main.ts` |
| `/server/` | `server/index.html` | `src/server-main.ts` |

Dakota and Server are unlisted. Do not promote them through
navigation, metadata, or sitemaps.

## Main page areas

`src/App.vue` renders the main page through these existing components:

- Scenes: `src/components/scenes/`
- Sections: `src/components/sections/`
- Navigation: `src/components/Navigation.vue` and `TopNavbar.vue`
- Shared content: `src/components/common/`

Main-site copy lives in `src/locales/`. Fixed links, credits, artwork paths, and
lists live in `src/content.ts`.

## Wolves areas

`/wolves/` is a public teaser page. `/wolves/experience/` is a cinematic
presentation performed to a live seated audience, not
a browsable page. See `AGENTS.md` under "`/wolves/experience/` is a
presentation" for the
production rules that constrain every change.

The Wolves runtime is documented in `docs/reference/wolves-runtime.md`. Do not
infer its content surfaces from this overview.
