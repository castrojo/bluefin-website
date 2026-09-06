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

## Front-page downloads

The main-site download picker is owned by `src/components/sections/SectionPicker.vue`,
while its user-facing copy belongs in `src/locales/en-US.json`. Adding a new
download card changes the rendered component surface and therefore needs an
explicitly approved design request; do not treat it as a locale-only edit.

Re-derive the owner and locale source with:

```bash
rg -n "ImageChooser|TryBluefin.Wolves|wolves-download" \
  src/components/sections/SectionPicker.vue src/locales/en-US.json
```

Reuse `src/components/common/ProductVersionCard.vue` — the extracted "raptor
card" — for any new product/download card. Do not author parallel markup or
styles for the same data; the labels and card chrome must not drift between
`/`, `/dakota/`, and `/server/`.

A card's title and description must be classed `<span>`s, not `<p>`. The global
`#scene-picker p` rule sets `text-align: center` and `max-width: 800px`, and its
id specificity beats any scoped component class, so a bare `<p>` silently
ignores the component's own alignment.

## Verification

- [ ] Diff contains only content, data, or approved assets.
- [ ] Existing keys and placeholders remain intact.
- [ ] Unlisted status is unchanged.
- [ ] Relevant checks pass.

## References

- `../../reference/content-map.md`
- `../../reference/production-entrypoints.md`
- `../design-gate/SKILL.md`

## Image version pipeline

### Registry ownership

The image version registry lives in `scripts/lib/image-sbom-registry.js`
(`scripts/lib/image-version-audit.js` is the orchestrator that consumes it).
Each entry declares an OCI image reference, required and optional SPDX package
names, and the `product` it belongs to (`bluefin` or `dakota`). To add a field:

1. Add a `packages` entry to the relevant record in the registry.
2. Mark it `required: true` if its absence should remove the product from display.
3. If the package name resolves to more than one version, add an `element`
   (BuildStream) or `type`/`foundBy` (Syft) selector and pin the fixture
   evidence in `scripts/tests/image-sbom-registry.test.ts`.
4. Run `npm run update:image-versions` to regenerate outputs.

BuildStream SBOMs can contain the same package name in several elements.
Name-only lookup is ambiguous when accepted versions differ and must publish
nothing. Add an `element` selector instead of choosing the highest version.

### SBOM sources

| Product | Registry | Image |
|---|---|---|
| Bluefin stable | `ghcr.io/ublue-os/bluefin` | Cosign-verified, SPDX referrer |
| Bluefin stable NVIDIA | `ghcr.io/ublue-os/bluefin-nvidia-open` | Cosign-verified, SPDX referrer |
| Dakota | `ghcr.io/projectbluefin/dakota` | Cosign-verified, SPDX referrer |
| Dakota NVIDIA | `ghcr.io/projectbluefin/dakota-nvidia` | Cosign-verified, SPDX referrer |

### Fail-closed behavior

If an image's SPDX referrer is missing or cosign verification fails, the image
is recorded as `status: "unavailable"` in the audit. Unavailable evidence
removes the corresponding website claims — no version is displayed for that
product variant. The pipeline never falls back to documentation, source trees,
or cached values.

An image whose required fields all resolved but whose *optional* fields did not
is `status: "degraded"`: its verified values are still published, the
unresolved fields are omitted, and an issue is opened. Ambiguity counts as
failure at both levels — a required ambiguous field makes the image
unavailable, an optional one degrades it.

A record with `pendingSbom: true` or an empty `packages` map stays
`unavailable` with `errorCode: "pending-mapping"` even after the image starts
publishing an SBOM. Publication is not a mapping; someone has to review which
package names map to which website fields.

`public/dakota-versions.json` keeps `packages.baseline` as static hardware
metadata. Preserve it while regenerating SBOM-derived fields. If gaming-image
evidence is unavailable, do not infer OGC Kernel from the NVIDIA driver or a
source tree.

Bluefin Server has no version updater or generated version file. Until it
publishes verifiable image SBOM evidence, render no version rows and retain
only its release destination plus the explicit unavailable status. Never
substitute Flatcar or another product's data.

### Commands

```bash
npm run check:image-sboms       # Manual, read-only live verification (exits nonzero on missing evidence)
npm run update:image-versions   # Regenerate public/*-versions.json and stream-versions.yml
```

The scheduled live smoke test is the daily `Update Live Data` workflow
(`.github/workflows/update-content.yml`), which runs `update:image-versions`
against the live registry every day at 10:00 UTC and files deduplicated issues.
`check:image-sboms` is the manual, read-only form of the same verification: it
writes no file and triggers no deployment, so run it locally before changing
the registry.

### Rule

**Unavailable image evidence removes website claims.** A product whose SBOM
cannot be verified does not display version data. This is intentional — showing
unverifiable versions is worse than showing nothing.

## Social preview cards

The website's primary Open Graph and Twitter preview card (`public/meta.webp`)
is dynamically generated from the official Bluefin desktop wallpaper pool
during site builds (`npm run build`).

- **Generator tooling**: `scripts/generate-social-cards.js` and
  `scripts/social-cards/template.html`.
- **Allowed wallpaper pool (36 items)**:
  - 24 first-party Bluefin monthly rotation wallpapers (January through December,
    Day and Night pairs).
  - 12 Bluefin Wolves story illustrations (`wolves/wolves/bluefin-*`).
- **Aurora & Xe exclusion**: Aurora artwork and Xe assets are strictly
  excluded from the social card pool.
- **Card layout**: Wallpaper signature layout featuring a crisp, bold Bluefin
  wordmark in the lower corner with a subtle localized vignette preserving
  artwork vibrancy and ensuring high contrast across diverse wallpapers.
- **Card geometry**: Rendered via Playwright at 1200×630 viewport with
  `deviceScaleFactor: 2`, producing a crisp 2400×1260 WebP image (standard
  1.91:1 Open Graph aspect ratio) encoded via `cwebp`.
- **Rotation**:
  - Monthly rotation (default): matches current calendar month (e.g. September)
    and day/night time.
  - Daily rotation (`--mode daily`): rotates deterministically by day-of-year across
    all 36 wallpapers.
- **Commands**:
  ```bash
  npm run generate:social-cards               # Monthly rotating wallpaper to public/meta.webp
  node scripts/generate-social-cards.js --mode daily   # Daily rotating across full pool
  node scripts/generate-social-cards.js --list  # Print all 36 allowed wallpapers in the pool
  node scripts/generate-social-cards.js --all   # Pre-render all 36 cards into public/cards/
  ```

## Sources

- ORAS referrer discovery and JSON output: `/oras-project/oras`
- Cosign verification and Sigstore transparency: `/sigstore/docs`
- Supply-chain scorecard context: `/ossf/scorecard`
