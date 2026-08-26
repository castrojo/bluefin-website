# Content map

**Agents edit content. Agents never edit design.**

| Area | Source | Allowed change |
|---|---|---|
| Main-site locale copy | `src/locales/en-US.json` and locale peers | Values only; preserve keys and placeholders. |
| Main-site fixed data | `src/content.ts` | Existing content values, links, and approved asset references. |
| Main-site section behavior | Existing component and data source | Content requests do not authorize component edits. |
| Bluefin stream versions | `public/stream-versions.yml` (generated) | Regenerate with `npm run update:image-versions`; do not hand-edit. |
| Dakota versions | `public/dakota-versions.json` (generated) | Regenerate with `npm run update:image-versions`; do not hand-edit. |
| Image version registry | `scripts/lib/image-sbom-registry.js` | Add/remove image records and package mappings. |
| Wolves lore | `src/data/lore/*.md` and `src/data/wolves-lore-records.ts` | Authored records and manifest entries. |
| Wolves signal text | `src/data/wolves-incoming-signal.txt` | Authored signal lines only. |
| Wolves intro data | `src/data/wolves-intro-sequence.ts` | User-supplied media and cue data only. |
| Wolves dinosaur registry | `src/data/wolves-dinosaur-species.ts` | Supplied registry facts only. |
| Wolves soundtrack | `public/wolves-playlist.json` and updater inputs | Regenerate; do not patch generated output. |
| Wolves wallpapers | `public/img/wallpapers/wolves/` | Approved WebP assets and curated values. |
| Wolves gallery | Existing gallery data and public photo manifest | Existing schema and supplied content only. |

Use `docs/reference/wolves-runtime.md` for locked surfaces, generators, and
Wolves-specific verification.
