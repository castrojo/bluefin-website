---
name: content-maintenance
description: Use when editing production text, links, translations, data, or approved assets without changing design.
---

# Content maintenance

## Overview

Maintain shipped content through existing data, locale, and asset surfaces.

## When to Use

Use for page copy, translations, URLs, approved images, downloads, and data.

## When NOT to Use

Do not use for layout, components, styles, typography, animation, navigation
prominence, or Wolves runtime engineering.

## Core Process

1. Read `../../reference/content-map.md`.
2. Identify the production entry and source file.
3. Preserve keys, placeholders, URLs, asset paths, and existing structure.
4. Edit content only.
5. Run the smallest relevant validation.

Use `import.meta.env.BASE_URL` for public runtime asset paths. Never hand-edit a
generated file.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The copy does not fit, so the component needs a small tweak." | Content work never changes design. Get approval, or change the copy. |
| "It is faster to patch the generated file." | Generated output is overwritten on the next run. Fix the generator or its source data. |

## Red Flags

- A content diff changes a component or stylesheet.
- A new key is added to make copy fit.
- An unlisted page is added to navigation or metadata.
- Generated output is patched instead of regenerated.

## Verification

- [ ] Diff contains only content, data, or approved assets.
- [ ] Existing keys and placeholders remain intact.
- [ ] Unlisted status is unchanged.
- [ ] Relevant checks pass.

## References

- `../../reference/content-map.md`
- `../../reference/production-entrypoints.md`
- `../design-gate/SKILL.md`
