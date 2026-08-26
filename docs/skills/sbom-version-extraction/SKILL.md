---
name: sbom-version-extraction
description: Use when editing scripts/lib/spdx-version-extractor.js, scripts/lib/oci-sbom.js, scripts/update-dakota-versions.js, or their tests.
---

# SBOM version extraction

## Overview

Dakota version data (`public/dakota-versions.json`) is derived exclusively from
SPDX SBOMs attached to published GHCR images. Editing the scripts that drive
this pipeline requires understanding how BuildStream SBOMs differ from Syft SBOMs
and how ambiguity is handled.

**Prohibited sources.** Do not reinstate parsing of `.bst` source refs or GitHub
file content. Those sources describe the next build, not the image users are
running. Any future PR restoring those imports should be rejected.

## When to Use

Use when editing any of these files:

- `scripts/lib/spdx-version-extractor.js`
- `scripts/lib/oci-sbom.js`
- `scripts/update-dakota-versions.js`
- `scripts/tests/spdx-version-extractor.test.ts`
- `scripts/tests/update-dakota-versions.test.ts`
- `scripts/tests/fixtures/dakota-linux-elements.spdx.json`

## When NOT to Use

Do not use for editing `public/dakota-versions.json` directly — that file is
generated. Do not use for Wolves version data; that lives in
`docs/reference/wolves-runtime.md`.

## Core Process

1. Read the prohibited-sources comment at the top of `update-dakota-versions.js`.
2. Run `npx vitest run scripts/tests/spdx-version-extractor.test.ts scripts/tests/update-dakota-versions.test.ts` before and after changes.
3. Commit the implementation file before or in the same commit as any test
   that imports it.
4. Update this skill when you discover a new correctness rule.



| File | Role |
|---|---|
| `scripts/lib/spdx-version-extractor.js` | Core extraction: `normalizeVersion`, `packageElement`, `extractMappedVersions` |
| `scripts/lib/oci-sbom.js` | OCI layer: `pullImageSbom`, `compareVersions`, `spdxPackageVersion` |
| `scripts/update-dakota-versions.js` | Updater: `versionsFromSbom`, `applyVersions`, `main` |
| `scripts/tests/spdx-version-extractor.test.ts` | Extractor unit tests |
| `scripts/tests/update-dakota-versions.test.ts` | Updater integration tests |
| `scripts/tests/fixtures/dakota-linux-elements.spdx.json` | BuildStream SPDX fixture |

## Critical correctness rules

### Ambiguity: never silently pick the highest version

BuildStream SBOMs list a package once per build element. The same package name
(`linux`) can carry multiple distinct versions from different elements
(`bootstrap/linux-headers.bst` = 6.12.40, `components/linux.bst` = 7.0.7).

`spdxPackageVersion(sbom, name)` **must return `undefined` when the name-only
lookup is ambiguous** (multiple distinct accepted versions). The function must
not fall back to picking the numerically highest value — that silently selects
headers over the kernel, or a build tool over a runtime package.

Callers that need element-pinned lookup must use `extractMappedVersions` with
an `element` selector.

### `compareVersions` must use `parseInt`, not `Number`

`Number('8-ogc1')` is `NaN`. `parseInt('8-ogc1', 10)` is `8`. The difference
matters because BuildStream kernel versions carry suffixes like `-ogc1`, `-rc2`,
and RPM release strings like `-1`. Passing such a version to any function that
uses `Number()` on dot-split segments will produce `NaN` comparisons, corrupting
sort order.

`compareVersions` in `oci-sbom.js` uses `parseInt(seg, 10)` on every segment.

### Hash rejection

`normalizeVersion` rejects any value matching `/^[0-9a-f]{40,}$/i` — that is,
strings of 40 or more lowercase or uppercase hex characters with no dots.
SHA-1 (40 hex), SHA-256 (64 hex), and similar commit hashes all match.

**Test fixtures must use a provably valid hash.** Use the SHA-256 of the empty
string to make the intent unambiguous:

```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

Verify with: `echo -n '' | sha256sum`

### Commit order: implementation before tests

When `scripts/update-dakota-versions.js` is dirty (uncommitted), tests that
import from it pass locally but fail in a clean worktree. Always commit the
implementation in the same commit as the tests that import it, or in a prior
commit. Never commit a test file before the module it imports.

## Fixture structure

`dakota-linux-elements.spdx.json` is a minimal BuildStream SPDX that exercises:

- `linux` 6.12.40 from `bootstrap/linux-headers.bst` (headers, not kernel)
- `linux` 7.0.7 from `components/linux.bst` (the real kernel)
- `linux` `e3b0c44298...` from `patches/linux-some-fix.bst` (hash → rejected)
- `NVIDIA-Linux-x86` 595.71.05 from `components/nvidia.bst` (unambiguous)
- `linux` 7.1.8-ogc1 from `core/linux-ogc.bst` (kernel with suffix)

A name-only `linux` mapping must be ambiguous (three distinct accepted versions).
Element-pinned mappings must resolve unambiguously to their single version.

## Running tests

```bash
npx vitest run scripts/tests/spdx-version-extractor.test.ts scripts/tests/update-dakota-versions.test.ts
```

Expected: all tests pass, no NaN warnings.

## Verification

```bash
# Check compareVersions handles kernel suffixes:
node -e "import('./scripts/lib/oci-sbom.js').then(m => console.log(m.compareVersions('7.1.8-ogc1','7.1.7')))"
# Expected: a positive number (not NaN)

# Verify spdxPackageVersion returns undefined on ambiguity:
node -e "
import('./scripts/lib/oci-sbom.js').then(({spdxPackageVersion}) => {
  const sbom = { packages: [
    { name: 'x', versionInfo: '1.0' },
    { name: 'x', versionInfo: '2.0' },
  ]}
  console.log(spdxPackageVersion(sbom, 'x'))  // must print: undefined
})"

# Verify fixture hash is valid SHA-256:
echo -n '' | sha256sum
# Expected: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  -
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The tests pass so highest-version fallback is fine." | A fallback silently hides element ambiguity. Return undefined; let the caller decide. |
| "I'll update the fixture hash later." | Use `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` from the start; it is verifiable. |
| "The implementation is only dirty, not missing." | Tests that import a dirty file fail in a clean worktree. Commit together. |

## Red Flags

- `spdxPackageVersion` returns a version string when the package appears under
  multiple build elements with different versions.
- `compareVersions('7.1.8-ogc1', '7.1.7')` returns `NaN` or throws.
- A fixture hash is shorter than 64 hex characters.
- `scripts/update-dakota-versions.js` is not committed but
  `update-dakota-versions.test.ts` is.
