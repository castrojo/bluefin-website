# Translation guide

## Boundary

Follow the canonical repository boundary in [`AGENTS.md`](AGENTS.md).
Translations change locale values only.

## Locale files

`src/locales/en-US.json` is the source locale. Existing translations are in
`src/locales/` and must preserve the same nested key structure.

To add or update a locale:

1. Copy the source structure from `src/locales/en-US.json`.
2. Translate values only.
3. Keep every key and nested object unchanged.
4. Preserve the locale filename's BCP 47 tag.
5. Inspect the page with the locale selected.

The current key set is the JSON source. Do not duplicate it in this guide.

## Value rules

Read the component that renders a field before editing it:

- Plain strings remain plain text.
- Markdown values keep their existing Markdown links and emphasis.
- HTML values keep their existing tags and attributes.
- URLs, asset paths, proper names, brand names, and attribution remain unchanged.
- Vue interpolation tokens such as `{date}` remain intact.

Do not add keys, move keys, change delimiters, or use HTML in a Markdown field.

## Verification

```bash
npm run typecheck
npm run build
```

Also compare keys and placeholders with `src/locales/en-US.json`, inspect the
selected locale in a browser, and confirm the diff contains locale content only.
