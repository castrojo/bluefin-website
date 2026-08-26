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

## Version data sourcing

Every variant's versions come from that variant's **published image SBOM**. Any
other source is a bug, including upstream `.bst` refs, release notes, and hand
edits. A `.bst` ref describes the *next* build, so it reports versions that have
never shipped — that is how the NVIDIA row briefly read `610.57.04` when the
published `dakota-nvidia` image contained `595.71.05`.

`scripts/lib/oci-sbom.js` is the shared reader. Images attach an
`application/vnd.spdx+json` referrer:

```bash
oras discover --artifact-type application/vnd.spdx+json --format json \
  ghcr.io/projectbluefin/dakota:latest
```

`pullImageSbom()` resolves and pulls it; `spdxPackageVersion()` reads one
package. BuildStream SBOMs list a package once per element, so a name carries
several `versionInfo` values plus commit hashes — take the highest numeric
version and skip non-numeric refs, otherwise `linux` resolves to `6.12.40`
instead of `7.0.7`.

Refresh with the generators, never by editing `public/*-versions.json`:

```bash
node scripts/update-dakota-versions.js   # dakota + dakota-nvidia SBOMs
node scripts/update-stream-versions.js   # bluefin stream SBOM attestations
```

`public/dakota-versions.json` keeps `packages.baseline` as hardware metadata,
not SBOM output. If a placeholder-generated file drops that field, the Dakota
updater must recover it from a static fallback (`x86-64-v3`) before projecting
the public JSON again.

If a package is absent from the SBOM it must not be displayed. `freedesktop-sdk`
and Homebrew are not in the Dakota SBOM, so they carry no version row.
The `dakota-gaming` and `dakota-nvidia-gaming` images currently publish
provenance referrers but no SPDX SBOM referrer, so an OGC kernel version must
not be inferred from the NVIDIA driver or source tree.

Display names come from upstream docs or element sources, never invented. The
NVIDIA row is `NVidia Driver` (`elements/bluefin-nvidia/nvidia-drivers.bst`
declares `nvidia-version`), not a coined phrase like "Open GPU Kernel".

### Bluefin Server version data is retired

`projectbluefin/server` is an **FSDK/BuildStream 2, DDI-first** OS. It does not
publish a container image or SBOM. The previous `update-server-versions.js`
fetched Flatcar Container Linux release streams and wrote `docker`/`containerd`/
`ignition`/`etcd` fields that do not exist in the product — those claims were
unverifiable and have been removed.

`public/server-versions.json` and `scripts/update-server-versions.js` are
deleted. `ServerVersion.vue` and `ServerHighlights.vue` no longer fetch version
data. When a product publishes no verifiable image SBOM, render no version
rows. Keep only the existing release destination and an explicit status
explaining that version details are withheld until verified image evidence
exists. If Bluefin Server later publishes an image SBOM, a new updater can be
written to source from it; do not reintroduce Flatcar or any substitute data
source.

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

## Sources

- ORAS referrer discovery and JSON output: `/oras-project/oras`
- Cosign verification and Sigstore transparency: `/sigstore/docs`
- Supply-chain scorecard context: `/ossf/scorecard`
