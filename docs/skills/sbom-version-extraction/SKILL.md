---
name: sbom-version-extraction
description: Use when editing scripts/lib/spdx-version-extractor.js, scripts/lib/oci-sbom.js, scripts/lib/image-sbom-registry.js, scripts/lib/image-version-audit.js, scripts/lib/verified-image-sbom.js, scripts/lib/sbom-issue-report.js, scripts/lib/sbom-issue-sync.js, scripts/lib/bluefin-version-projection.js, scripts/lib/dakota-version-projection.js, scripts/update-dakota-versions.js, scripts/update-stream-versions.js, scripts/update-image-versions.js, .github/workflows/update-content.yml, or their tests.
---

# SBOM version extraction

## Overview

Version data for Dakota (`public/dakota-versions.json`) and Bluefin
(`public/stream-versions.yml`) is derived exclusively from SPDX SBOMs attached
to published GHCR images. Editing the scripts that drive this pipeline requires
understanding how BuildStream SBOMs differ from Syft SBOMs and how ambiguity is
handled.

**Prohibited sources.** Do not reinstate parsing of `.bst` source refs or GitHub
file content. Those sources describe the next build, not the image users are
running. Any future PR restoring those imports should be rejected.

## When to Use

Use when editing any of these files:

- `scripts/lib/spdx-version-extractor.js`
- `scripts/lib/bluefin-version-projection.js`
- `scripts/lib/oci-sbom.js`
- `scripts/update-dakota-versions.js`
- `scripts/update-stream-versions.js`
- `scripts/tests/spdx-version-extractor.test.ts`
- `scripts/tests/bluefin-version-projection.test.ts`
- `scripts/tests/update-dakota-versions.test.ts`
- `scripts/tests/update-stream-versions.test.ts`
- `scripts/tests/fixtures/dakota-linux-elements.spdx.json`

## When NOT to Use

Do not use for editing `public/dakota-versions.json` directly — that file is
generated. Do not use for Wolves version data; that lives in
`docs/reference/wolves-runtime.md`.

## Core Process

1. Read the prohibited-sources comment at the top of `update-dakota-versions.js`.
2. Run `npx vitest run scripts/tests/spdx-version-extractor.test.ts scripts/tests/update-dakota-versions.test.ts scripts/tests/bluefin-version-projection.test.ts scripts/tests/update-stream-versions.test.ts` before and after changes.
3. Commit the implementation file before or in the same commit as any test
   that imports it.
4. Update this skill when you discover a new correctness rule.



| File | Role |
|---|---|
| `scripts/lib/spdx-version-extractor.js` | Core extraction: `normalizeVersion`, `packageElement`, `extractMappedVersions` |
| `scripts/lib/bluefin-version-projection.js` | Bluefin projection: `projectBluefinStreams`, `normalizeUserVersion` |
| `scripts/lib/oci-sbom.js` | OCI layer: `pullImageSbom`, `compareVersions`, `spdxPackageVersion` |
| `scripts/update-dakota-versions.js` | Dakota updater: `versionsFromSbom`, `applyVersions`, `main` |
| `scripts/update-stream-versions.js` | Bluefin updater: `updateProducts`, `createHeader` |
| `scripts/tests/spdx-version-extractor.test.ts` | Extractor unit tests |
| `scripts/tests/bluefin-version-projection.test.ts` | Projection unit tests |
| `scripts/tests/update-dakota-versions.test.ts` | Dakota updater integration tests |
| `scripts/tests/update-stream-versions.test.ts` | Bluefin updater tests |
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

### Bluefin projection-layer normalisation

User-facing RPM versions in `stream-versions.yml` are normalised by
`normalizeUserVersion` in `bluefin-version-projection.js`, **not** in the shared
extractor. The shared extractor preserves raw SPDX evidence unchanged.

Rules:
- Strip leading numeric epoch (`3:610.57.04-1.fc44` → `610.57.04-1`)
- Strip trailing `.fcNN` / `.elNN` suffix (`7.1.6-201.fc44` → `7.1.6-201`)
- Preserve RPM release segment (`-1`, `-201`)

### `versionInfo` takes precedence over `version`

`extractMappedVersions` reads `pkg.versionInfo ?? pkg.version`. Syft SBOMs use
`version`; SPDX uses `versionInfo`. The fallback is necessary for Syft
compatibility. Do not normalise or strip raw values in the shared extractor.

### `checkedAt` in stream-versions.yml

`stream-versions.yml` must include a top-level `checkedAt` ISO timestamp.
`ImageChooser.vue` declares `checkedAt?: string` in `StreamVersions`.

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

## Orchestrator (`image-version-audit.js` / `update-image-versions.js`)

Task 4 adds a registry-wide orchestrator on top of the extractor.

**Failure policy (enforced by tests):**
- `pendingSbom` records are NOT skipped — they are attempted like all others.
- `EvidenceError` from any image (required or optional) → `status: "unavailable"` in the audit with `required`, `errorCode`, and `error` fields.
- `ToolingError` or any other non-`EvidenceError` → abort, no file written.
- Missing or ambiguous *required* package → `status: "unavailable"` with
  `missingRequired` / `ambiguousRequired` and errorCode `missing-required` /
  `ambiguous-required`. Missing wins when both apply.
- Missing or ambiguous *optional* package → `status: "degraded"`, verified
  values kept, unresolved fields omitted, errorCode `ambiguous-optional` /
  `missing-optional`. Ambiguous wins when both apply.
- `pendingSbom: true` or an empty `packages` map → `status: "unavailable"`,
  errorCode `pending-mapping`, digests retained — even when the image now
  publishes an SPDX referrer.
- Every entry carries `fields` (the mapped field names) so the field-loss guard
  can tell an explained removal from a broken verifier.
- Unavailable entries never carry `values`. A projection cannot leak what the
  audit does not hold.

**Status vocabulary is audit-only.** `public/stream-versions.yml` and
`public/dakota-versions.json` still use `verified` / `unavailable`, because
`ImageChooser.vue` and `DakotaVersionCard.vue` gate rendering on
`status === 'verified'`. Degradation is expressed by the *absence* of the
unresolved field, plus the audit record and its issue. Do not emit `degraded`
into a public file without changing those components first — that is a design
change, not a content change.

**`productStatus` logic:**
- All verified → `ok`
- Any *required* unavailable → `unavailable`
- Otherwise (degraded or optional unavailable) → `degraded`

**`--check-only` exits nonzero when ANY audit entry is unavailable**, including optional pending evidence. Normal mode exits zero for EvidenceErrors so deployment proceeds and issues alert. Exit code `2` is reserved for a `ToolingError`: nothing was written.

**Atomic writes:** `writeOutputsAtomically` validates all outputs first, then writes to a `mkdtempSync` directory **inside `destinationRoot`** (not `os.tmpdir()`) and renames each file into place. Staging under the same filesystem as the destination guarantees `renameSync` cannot fail with `EXDEV`. If validation throws, no file is written; cleanup removes only the staging subdirectory, never `destinationRoot`.

**Dependency injection:** `verifyRegistry` accepts `collectVerifiedImageSbom`, `now`, `run`, and `fs` so tests can run without network or disk I/O.

**`product` is required on every audit image entry.** `verifyRegistry` copies `record.product` onto each output entry (verified and unavailable). `productStatus` throws an explicit error if any entry lacks a `product` field — there is no silent `"unknown"` fallback. The composition `productStatus(await verifyRegistry(records, deps))` must work without caller mutation.



## Evidence failure vs tooling failure

`scripts/lib/verified-image-sbom.js` exports two error types and the difference
decides whether the website loses a version claim:

| Type | Means | Effect |
|---|---|---|
| `EvidenceError` | The publisher did not publish usable evidence | Recorded in the audit, field/product sanitized out, issue opened |
| `ToolingError` | We could not look | Aborts the run before any output, cache, or deploy |

`classifyToolFailure(err, tool)` runs first on every child-process failure and
returns a `ToolingError` for:

- `tool-missing` — spawn `ENOENT` (oras/cosign absent from PATH)
- `tool-timeout` — `ETIMEDOUT`, a killed process, or "context deadline exceeded"
- `registry-unavailable` — 429/500/502/503/504, `TOOMANYREQUESTS`
- `transport` — `ECONNRESET`/`ECONNREFUSED`/`EAI_AGAIN`, "no such host",
  "dial tcp", "tls: handshake failure", "certificate signed by unknown authority"
- `tool-io` — local `EACCES`/`EIO`/`ENOSPC`/`EMFILE`
- `malformed-output` — `oras discover` returned unparseable JSON
- `tool-failure` — anything unrecognised. **Unknown failures block.** We cannot
  tell "absent" from "unreachable", and blocking is the only safe default.

Only these stay `EvidenceError`:

- `image-not-found` — `NAME_UNKNOWN` / `MANIFEST_UNKNOWN` / "manifest unknown" / 404
- `missing-sbom`, `ambiguous-sbom` — referrer count is not exactly one
- `missing-provenance` — cosign found no matching attestation
- `invalid-provenance` — cosign rejected the identity (wrong publisher)
- `invalid-sbom` — the discovered SBOM artifact is absent or corrupt

Note the deliberate asymmetry in `pullSpdxReferrer`: a *network* failure while
pulling blocks, but a discovered artifact that is missing or unparseable is an
evidence failure, because the publisher attached a referrer it cannot serve.

Do not widen the transport pattern to bare `certificate` or `x509`: cosign
reports identity failures with those words, and misclassifying one as transport
would turn a wrong-publisher signature into a silent retry.

## Explained field loss

`assertExplainedFieldLoss()` runs in `update-image-versions.js` before any
output is promoted. Every field present in the previous public file and absent
from the new one must be explained by the current audit:

- listed in `missingRequired`, `missingOptional`, `ambiguousRequired`, or
  `ambiguousOptional` for that product, or
- mapped by an image of that product whose status is `unavailable`, or
- part of a block that is now explicitly `status: unavailable` while the product
  has an unavailable image.

Anything else throws before promotion. The alias map handles projection-level
renames (`hwe` ← the HWE image's `kernel` field); `baseline` is passed via
`ignore` because it is static metadata, not SBOM evidence.

## Image staleness: `checkedAt`, not image age

The design document lists "maximum acceptable age" as a registry field. It is
deliberately not implemented as an image-publication-age threshold, and adding
one would be wrong:

- What must be fresh is the **evidence**, and the daily run records that
  directly as `checkedAt` on every audit entry and every public file. A run
  older than a day is visible without inventing a number.
- Image publication age is **release cadence**, not staleness. A stable image
  that has not been rebuilt in six weeks because nothing changed is correct, not
  stale; failing it would remove accurate version data from the website and
  open an issue nobody can fix.
- Any threshold would be an invented constant with no upstream contract behind
  it, and the first long holiday freeze would turn it into noise everyone learns
  to ignore.

If upstream ever publishes a rebuild SLA, that SLA — not a guess — becomes the
threshold.

## github-script must not import relative paths

`actions/github-script` compiles the YAML `script` body inside its own bundled
module under `_actions/`, so `await import('./scripts/lib/x.js')` resolves
against the action, not the checkout, and throws `ERR_MODULE_NOT_FOUND` at
runtime while every YAML assertion passes.

Two rules:

1. Resolve from the working directory:
   `pathToFileURL(path.join(process.cwd(), 'scripts', 'lib', 'x.js')).href`.
2. Keep the body to a loader. The logic lives in `scripts/lib/sbom-issue-sync.js`
   so it can be tested directly.

`scripts/tests/workflow-sbom-policy.test.ts` executes the real script bodies
through `scripts/tests/fixtures/github-script-runner.mjs`, which reproduces the
action's referrer semantics (compiled in a module away from the repo root, run
with the repo root as cwd). It carries a negative-control test proving a
relative specifier still fails there.

## Issue alerts

- Title is `[SBOM verification] <product>: <errorCode>` — the **exact** audit
  code, so two different failures never share an issue.
- `degraded` images alert too; a silently omitted optional field is the loss
  this pipeline exists to surface.
- Bodies carry the workflow run URL and the per-image last successful
  verification, or the literal `none recorded`.
- `annotateLastSuccessful()` copies the previous audit's `checkedAt` onto
  currently failing entries, which is why `update-content.yml` restores the
  live-data cache *before* verification, using the exact save path list in the
  same order.
- Both `listForRepo` calls use `github.paginate`. Deduplication that only reads
  the first 100 open issues silently starts opening duplicates.
- The generic run-failure issue is deduplicated by exact title too, via
  `syncWorkflowFailureIssue()`.
