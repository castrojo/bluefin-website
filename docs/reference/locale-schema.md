# Locale schema

Repository boundary: [`../../AGENTS.md`](../../AGENTS.md).

`src/locales/en-US.json` is the source locale. Other locale files must preserve
its key and object structure.

## Value formats

Read the rendering component before editing a value:

- Plain strings render as text.
- Markdown values accept the Markdown syntax already used by the source.
- HTML values accept only the existing HTML structure.
- URLs, asset paths, brand names, names, and attribution must remain unchanged
  unless the source explicitly changes them.
- Vue interpolation tokens such as `{date}` must remain intact.

Do not add keys, move keys, change delimiters, or use HTML in a Markdown field.
The full current key set is the JSON source itself; this reference intentionally
does not duplicate it.
