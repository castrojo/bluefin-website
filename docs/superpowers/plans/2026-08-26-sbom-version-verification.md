# SBOM-Verified Website Version Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Check every image-backed version displayed by the website directly against a published image SBOM every day, and remove fields that cannot be verified.

**Architecture:** A declarative image registry feeds a shared ORAS/Cosign collector and an element-aware SPDX extractor. Product projections generate the existing Bluefin and Dakota public data files plus a non-public audit report; evidence failures produce sanitized outputs, while checker/schema failures block deployment.

**Tech Stack:** Node.js 24, TypeScript/Vitest tests, ORAS CLI, Sigstore Cosign, SPDX JSON, js-yaml, GitHub Actions, Vue 3.

## Global Constraints

- Every displayed image-backed version must come from the current published image SBOM.
- Run verification daily.
- Resolve moving tags to immutable image digests before discovery or verification.
- Never source versions from release notes, source files, another product, or previous generated data.
- Missing or ambiguous evidence removes the affected field or product block and alerts.
- Bluefin must use direct image SBOMs, not `docs.projectbluefin.io/data/sbom-attestations.json`.
- ORAS referrers must use exact artifact types.
- Sigstore verification must constrain certificate identity and OIDC issuer.
- GitHub Actions permissions remain least-privilege and every action remains pinned by commit SHA.
- Preserve existing public file names during migration: `public/stream-versions.yml` and `public/dakota-versions.json`.
- Do not display literal `"unknown"` values.
- Bluefin Server remains outside the registry until it publishes an image SBOM.

---

### Task 1: Define and validate the image registry

**Files:**
- Create: `scripts/lib/image-sbom-registry.js`
- Create: `scripts/tests/image-sbom-registry.test.ts`

**Interfaces:**
- Produces: `IMAGE_SBOM_REGISTRY: readonly ImageSbomRecord[]`
- Produces: `validateImageSbomRegistry(records): void`
- Produces:

```js
/**
 * @typedef {{
 *   id: string,
 *   product: 'bluefin'|'dakota',
 *   required: boolean,
 *   pendingSbom?: boolean,
 *   image: string,
 *   certificateIdentityRegexp: string,
 *   certificateOidcIssuer: string,
 *   packages: Record<string, {
 *     name: string,
 *     element?: string,
 *     type?: string,
 *     foundBy?: string,
 *     required: boolean
 *   }>
 * }} ImageSbomRecord
 */
```

- [ ] **Step 1: Write registry validation tests**

Create tests that reject duplicate IDs, mutable image references without tags,
empty identity constraints, duplicate output fields within one record, and a
package mapping with neither `name` nor a boolean `required`. Reject an empty
`packages` object unless `pendingSbom: true`.

```ts
expect(() => validateImageSbomRegistry([
  { ...record, id: 'bluefin-stable' },
  { ...record, id: 'bluefin-stable' },
])).toThrow('duplicate image registry id "bluefin-stable"')
```

- [ ] **Step 2: Run the tests and verify failure**

Run:

```bash
npx vitest run scripts/tests/image-sbom-registry.test.ts
```

Expected: FAIL because `image-sbom-registry.js` does not exist.

- [ ] **Step 3: Implement the registry and validator**

Register these image channels:

```js
export const IMAGE_SBOM_REGISTRY = [
  {
    id: 'bluefin-stable',
    product: 'bluefin',
    required: true,
    image: 'ghcr.io/ublue-os/bluefin:stable',
    certificateIdentityRegexp: '^https://github.com/ublue-os/bluefin/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {
      base: { name: 'kernel-core', type: 'rpm', required: true },
      kernel: { name: 'kernel-core', type: 'rpm', required: true },
      gnome: { name: 'gnome-shell', type: 'rpm', required: true },
      mesa: { name: 'mesa', type: 'rpm', required: false },
      systemd: { name: 'systemd', required: false },
      podman: { name: 'podman', required: false },
      pipewire: { name: 'pipewire', required: false },
      flatpak: { name: 'flatpak', required: false },
    },
  },
  {
    id: 'bluefin-stable-nvidia',
    product: 'bluefin',
    required: false,
    image: 'ghcr.io/ublue-os/bluefin-nvidia-open:stable',
    certificateIdentityRegexp: '^https://github.com/ublue-os/bluefin/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {
      nvidia: { name: 'nvidia-driver', required: true },
    },
  },
  {
    id: 'bluefin-lts',
    product: 'bluefin',
    required: true,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/bluefin-lts:stable',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/bluefin-lts/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  },
  {
    id: 'bluefin-lts-hwe',
    product: 'bluefin',
    required: false,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/bluefin-lts-hwe:stable',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/bluefin-lts/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  },
  {
    id: 'bluefin-lts-nvidia',
    product: 'bluefin',
    required: false,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/bluefin-lts-nvidia:stable',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/bluefin-lts/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  },
  {
    id: 'dakota',
    product: 'dakota',
    required: true,
    image: 'ghcr.io/projectbluefin/dakota:latest',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {
      kernel: { name: 'linux', element: 'freedesktop-sdk.bst:components/linux.bst', required: true },
      gnome: { name: 'gnome-shell', required: true },
      mesa: { name: 'mesa', required: true },
      systemd: { name: 'systemd', required: false },
      podman: { name: 'podman', required: false },
      pipewire: { name: 'pipewire', required: false },
      flatpak: { name: 'flatpak', required: false },
      bootc: { name: 'bootc', required: false },
    },
  },
  {
    id: 'dakota-nvidia',
    product: 'dakota',
    required: false,
    image: 'ghcr.io/projectbluefin/dakota-nvidia:latest',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {
      nvidia: { name: 'NVIDIA-Linux-x86', required: true },
    },
  },
  {
    id: 'dakota-gaming',
    product: 'dakota',
    required: false,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/dakota-gaming:testing',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  },
  {
    id: 'dakota-nvidia-gaming',
    product: 'dakota',
    required: false,
    pendingSbom: true,
    image: 'ghcr.io/projectbluefin/dakota-nvidia-gaming:testing',
    certificateIdentityRegexp: '^https://github.com/projectbluefin/dakota/.github/workflows/[^@]+@refs/.+$',
    certificateOidcIssuer: 'https://token.actions.githubusercontent.com',
    packages: {},
  },
]
```

The implementation must run `validateImageSbomRegistry(IMAGE_SBOM_REGISTRY)` at
module load so invalid mappings fail before network access.

`pendingSbom` records are checked daily but always produce an evidence failure
until a live SPDX referrer is available and its package identifiers have been
inspected and added in a reviewed registry change.

- [ ] **Step 4: Run the registry tests**

Run:

```bash
npx vitest run scripts/tests/image-sbom-registry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/image-sbom-registry.js scripts/tests/image-sbom-registry.test.ts
git commit -m "feat(sbom): register website image sources" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Build the verified OCI collector

**Files:**
- Create: `scripts/lib/verified-image-sbom.js`
- Create: `scripts/tests/verified-image-sbom.test.ts`
- Create: `scripts/tests/fixtures/oras-dakota-discovery.json`
- Create: `scripts/tests/fixtures/oras-gaming-no-sbom.json`

**Interfaces:**
- Consumes: `ImageSbomRecord` from Task 1.
- Produces:

```js
export function resolveImageDigest(image, run = execFileSync) {}
export function discoverReferrers(imageAtDigest, run = execFileSync) {}
export function verifyImageProvenance(imageAtDigest, policy, run = execFileSync) {}
export function pullSpdxReferrer(repository, digest, run = execFileSync) {}
export function collectVerifiedImageSbom(record, dependencies = {}) {}
```

- Produces:

```js
{
  id,
  image,
  imageDigest,
  sbomDigest,
  checkedAt,
  sbom
}
```

- [ ] **Step 1: Capture deterministic discovery fixtures**

Store trimmed ORAS JSON fixtures containing only `reference`, `digest`, and
`referrers`. The Dakota fixture must contain both
`application/vnd.dev.sigstore.bundle.v0.3+json` and
`application/vnd.spdx+json`; the gaming fixture must contain provenance only.

- [ ] **Step 2: Write failing collector tests**

Test:

- A moving tag resolves to `repository@sha256:...`.
- Discovery happens against the digest, not the tag.
- The collector requires exactly one SPDX referrer.
- Missing SPDX returns a typed `EvidenceError` with code `missing-sbom`.
- Cosign is called with:

```text
verify-attestation
--type slsaprovenance
--certificate-identity-regexp <registry value>
--certificate-oidc-issuer <registry value>
<image@digest>
```

- `pullSpdxReferrer` removes its temporary directory in success and failure
  cases.

- [ ] **Step 3: Run the tests and verify failure**

Run:

```bash
npx vitest run scripts/tests/verified-image-sbom.test.ts
```

Expected: FAIL because the collector does not exist.

- [ ] **Step 4: Implement the collector**

Use `oras manifest fetch --descriptor --format json <image>` to obtain the
immutable digest, `oras discover --format json <image@digest>` to enumerate
referrers, and `cosign verify-attestation` for provenance. Never shell-expand
arguments; use `execFileSync`.

Define:

```js
export class EvidenceError extends Error {
  constructor(code, image, message) {
    super(message)
    this.name = 'EvidenceError'
    this.code = code
    this.image = image
  }
}
```

Convert registry/network/tool failures into these exact codes:
`image-not-found`, `missing-provenance`, `invalid-provenance`, `missing-sbom`,
`ambiguous-sbom`, and `invalid-sbom`.

- [ ] **Step 5: Run the collector tests**

Run:

```bash
npx vitest run scripts/tests/verified-image-sbom.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/verified-image-sbom.js scripts/tests/verified-image-sbom.test.ts scripts/tests/fixtures/oras-*.json
git commit -m "feat(sbom): verify OCI image evidence" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Extract versions without conflating package evidence

**Files:**
- Create: `scripts/lib/spdx-version-extractor.js`
- Create: `scripts/tests/spdx-version-extractor.test.ts`
- Create: `scripts/tests/fixtures/dakota-linux-elements.spdx.json`
- Modify: `scripts/lib/oci-sbom.js`
- Modify: `scripts/tests/update-dakota-versions.test.ts`

**Interfaces:**
- Consumes: SPDX JSON and registry package mappings.
- Produces:

```js
export function normalizeVersion(raw) {}
export function packageElement(pkg) {}
export function extractMappedVersions(sbom, mappings) {}
```

- Returns:

```js
{
  values: Record<string, string>,
  missingRequired: string[],
  missingOptional: string[],
  ambiguous: string[],
  rejected: Array<{ field: string, value: unknown }>
}
```

- [ ] **Step 1: Write the Linux element fixture**

Include:

- `linux` `6.12.40` from `bootstrap/linux-headers.bst`.
- `linux` `7.0.7` from `components/linux.bst`.
- A hash-valued patch record.
- `NVIDIA-Linux-x86` `595.71.05`.
- A future `linux` `7.1.8-ogc1` from `core/linux-ogc.bst`.

- [ ] **Step 2: Write failing extraction tests**

Assert:

```ts
expect(result.values.kernel).toBe('7.0.7')
expect(result.values['ogc-kernel']).toBe('7.1.8-ogc1')
expect(result.values.nvidia).toBe('595.71.05')
```

Also assert that a name-only `linux` mapping with multiple element versions is
reported as ambiguous instead of selecting the numerically highest value.

- [ ] **Step 3: Run the tests and verify failure**

Run:

```bash
npx vitest run scripts/tests/spdx-version-extractor.test.ts
```

Expected: FAIL because the extractor does not exist.

- [ ] **Step 4: Implement element-aware extraction**

Support both BuildStream SPDX `packages` and Syft SPDX `artifacts`. Read
BuildStream provenance from:

```js
pkg.externalRefs?.find(ref => ref.referenceType === 'bst-element')?.referenceLocator
```

For Syft artifacts, apply exact `type` and `foundBy` selectors when the registry
provides them. Compare distinct normalized versions after selectors; identical
duplicate evidence is safe, but two different versions are ambiguous.

Accept numeric versions with optional RPM epoch/release and optional kernel
suffixes such as `-ogc1`. Reject full commit hashes. If more than one distinct
accepted version remains after name and element filtering, record the field in
`ambiguous`.

Keep `spdxPackageVersion()` temporarily as a compatibility wrapper that calls
the new extractor for name-only mappings with one unambiguous value.

- [ ] **Step 5: Run extraction and Dakota helper tests**

Run:

```bash
npx vitest run scripts/tests/spdx-version-extractor.test.ts scripts/tests/update-dakota-versions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/spdx-version-extractor.js scripts/lib/oci-sbom.js scripts/tests/spdx-version-extractor.test.ts scripts/tests/update-dakota-versions.test.ts scripts/tests/fixtures/dakota-linux-elements.spdx.json
git commit -m "fix(sbom): distinguish package build elements" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Orchestrate daily verification and audit output

**Files:**
- Create: `scripts/update-image-versions.js`
- Create: `scripts/lib/image-version-audit.js`
- Create: `scripts/tests/update-image-versions.test.ts`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: registry, collector, and extractor from Tasks 1-3.
- Produces:

```js
export async function verifyRegistry(records, dependencies) {}
export function productStatus(records) {}
export function writeOutputsAtomically(outputs, destinationRoot) {}
```

- Produces `.cache/website-live-data/sbom-audit.json`:

```json
{
  "checkedAt": "2026-08-26T00:00:00.000Z",
  "images": [
    {
      "id": "dakota",
      "image": "ghcr.io/projectbluefin/dakota:latest",
      "imageDigest": "sha256:...",
      "sbomDigest": "sha256:...",
      "status": "verified",
      "values": { "kernel": "7.0.7" },
      "missingOptional": []
    }
  ]
}
```

- [ ] **Step 1: Write orchestration failure-policy tests**

Cover:

- Required image evidence failure marks the product `unavailable`.
- Optional image evidence failure removes only that image's fields.
- Missing optional package omits one field.
- Missing required package marks its image unavailable.
- Checker exceptions that are not `EvidenceError` abort without writing files.
- No previous generated field appears in the new result.
- Atomic output writes leave existing files unchanged if projection validation
  throws.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npx vitest run scripts/tests/update-image-versions.test.ts
```

Expected: FAIL because the orchestrator does not exist.

- [ ] **Step 3: Implement orchestration**

Use dependency injection for `collectVerifiedImageSbom`, `now`, and filesystem
operations. Write all projections under a `fs.mkdtempSync()` directory, validate
them, then rename individual completed files into place.

Add:

```json
"update:image-versions": "node scripts/update-image-versions.js",
"check:image-sboms": "node scripts/update-image-versions.js --check-only"
```

Add `.cache/website-live-data/` to `.gitignore`.

- [ ] **Step 4: Run orchestration tests**

Run:

```bash
npx vitest run scripts/tests/update-image-versions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json scripts/update-image-versions.js scripts/lib/image-version-audit.js scripts/tests/update-image-versions.test.ts
git commit -m "feat(sbom): orchestrate verified version refreshes" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 5: Migrate Dakota to the shared projection

**Files:**
- Create: `scripts/lib/dakota-version-projection.js`
- Create: `scripts/tests/dakota-version-projection.test.ts`
- Modify: `scripts/update-dakota-versions.js`
- Modify: `public/dakota-versions.json`
- Modify: `src/composables.ts`
- Modify: `src/tests/dakotaVersionCard.test.ts`
- Modify: `src/tests/dakotaVersionChips.test.ts`
- Modify: `src/tests/sectionPicker.test.ts`

**Interfaces:**
- Consumes verified records keyed by registry ID.
- Produces:

```js
export function projectDakotaVersions(results, previousMetadata, checkedAt) {}
```

- Produces public shape:

```ts
interface DakotaVersions {
  checkedAt: string
  status: 'verified' | 'unavailable'
  sources: Array<{ id: string, image: string, imageDigest: string, sbomDigest: string }>
  isos?: Array<{ label: string, filename: string }>
  packages: Record<string, string>
}
```

- [ ] **Step 1: Write failing Dakota projection tests**

Assert:

- Base fields come only from `dakota`.
- NVIDIA comes only from `dakota-nvidia`.
- OGC appears only from verified `dakota-gaming`.
- Missing gaming SBOM omits OGC without affecting base Dakota.
- Required base failure returns `status: 'unavailable'` and `packages: {}`.
- `isos` and `baseline` metadata survive projection.
- Stale `freedesktop-sdk`, Homebrew, and OGC values do not survive.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npx vitest run scripts/tests/dakota-version-projection.test.ts
```

Expected: FAIL because the projection does not exist.

- [ ] **Step 3: Implement the projection and compatibility wrapper**

Make `scripts/update-dakota-versions.js` call the shared orchestrator for only
the Dakota records so local workflows remain usable:

```js
await updateProducts({ products: ['dakota'] })
```

Do not keep its own image names or package maps.

- [ ] **Step 4: Update front-end types and fail-closed tests**

Components must render version rows only when `status === 'verified'`. Existing
download links remain available from `isos` even when version evidence is
unavailable.

Add an assertion to `sectionPicker.test.ts`:

```ts
expect(labels).not.toContain('OGC Kernel')
```

when the fixture contains no verified gaming result.

- [ ] **Step 5: Regenerate and run Dakota tests**

Run:

```bash
node scripts/update-dakota-versions.js
npx vitest run scripts/tests/dakota-version-projection.test.ts scripts/tests/update-dakota-versions.test.ts src/tests/dakotaVersionCard.test.ts src/tests/dakotaVersionChips.test.ts src/tests/sectionPicker.test.ts
```

Expected: PASS, and `public/dakota-versions.json` contains no unverified fields.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/dakota-version-projection.js scripts/tests/dakota-version-projection.test.ts scripts/update-dakota-versions.js public/dakota-versions.json src/composables.ts src/tests/dakotaVersionCard.test.ts src/tests/dakotaVersionChips.test.ts src/tests/sectionPicker.test.ts
git commit -m "feat(dakota): project versions from verified SBOMs" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 6: Migrate Bluefin directly to image SBOMs

**Files:**
- Create: `scripts/lib/bluefin-version-projection.js`
- Create: `scripts/tests/bluefin-version-projection.test.ts`
- Modify: `scripts/update-stream-versions.js`
- Modify: `scripts/tests/update-stream-versions.test.ts`
- Modify: `public/stream-versions.yml`
- Modify: `src/components/ImageChooser.vue`
- Modify: `src/tests/imageChooser.test.ts`

**Interfaces:**
- Consumes verified records keyed by `bluefin-stable`,
  `bluefin-stable-nvidia`, `bluefin-lts`, `bluefin-lts-hwe`, and
  `bluefin-lts-nvidia`.
- Produces:

```js
export function projectBluefinStreams(results, checkedAt) {}
```

- Produces YAML:

```yaml
checkedAt: "2026-08-26T00:00:00.000Z"
stable:
  status: "verified"
  base: "Fedora 44"
  kernel: "7.0.12-201"
  gnome: "50.3-1"
  mesa: "26.1.4-4"
lts:
  status: "verified"
  base: "CentOS Stream 10"
  kernel: "6.12.0-233.el10"
```

- [ ] **Step 1: Replace documentation-cache tests with projection tests**

Delete tests for `latestPv()` and `buildStreamVersionData(streams)`. Add tests
that:

- Stable values come from `bluefin-stable`.
- Stable NVIDIA comes only from `bluefin-stable-nvidia`.
- LTS, HWE, and NVIDIA fields come from their respective images after those
  images publish SPDX referrers and reviewed package mappings.
- Missing optional NVIDIA/HWE images omit those fields.
- The currently pending LTS SBOM returns that stream with
  `status: 'unavailable'` and no versions.
- No literal `"unknown"` appears in serialized YAML.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npx vitest run scripts/tests/bluefin-version-projection.test.ts scripts/tests/update-stream-versions.test.ts
```

Expected: FAIL because direct projection is not implemented.

- [ ] **Step 3: Implement Bluefin projection**

Remove:

```js
const SBOM_URL = 'https://docs.projectbluefin.io/data/sbom-attestations.json'
```

and all `latestPv()` cache parsing. Make `update-stream-versions.js` a
compatibility wrapper around the shared orchestrator:

```js
await updateProducts({ products: ['bluefin'] })
```

Derive Fedora base from the verified `kernel-core` RPM suffix and use the LTS
image's verified FSDK/base package mapping rather than a hard-coded value.

- [ ] **Step 4: Make ImageChooser fail closed**

Update its `StreamVersions` type to include `status`. A stream with
`status !== 'verified'` must not render version chips or `"unknown"` values.
Download selection remains functional because image filenames are not version
claims.

- [ ] **Step 5: Regenerate and run Bluefin tests**

Run:

```bash
node scripts/update-stream-versions.js
npx vitest run scripts/tests/bluefin-version-projection.test.ts scripts/tests/update-stream-versions.test.ts src/tests/imageChooser.test.ts
```

Expected: PASS, with every generated Bluefin value tied to a direct image
digest.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/bluefin-version-projection.js scripts/tests/bluefin-version-projection.test.ts scripts/update-stream-versions.js scripts/tests/update-stream-versions.test.ts public/stream-versions.yml src/components/ImageChooser.vue src/tests/imageChooser.test.ts
git commit -m "feat(bluefin): source versions from image SBOMs" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 7: Retire unverifiable Server version claims

**Files:**
- Delete: `public/server-versions.json`
- Delete: `scripts/update-server-versions.js`
- Modify: `src/components/server/ServerVersion.vue`
- Modify: `src/components/server/ServerHighlights.vue`
- Modify: `src/tests/serverVersion.test.ts`
- Modify: `docs/skills/content-maintenance/SKILL.md`

**Interfaces:**
- Produces no Server version-data API until a published Server image SBOM exists.

- [ ] **Step 1: Write fail-closed Server component tests**

Replace the Flatcar stream fixture tests with assertions that the Server page:

- Contains no Flatcar version, kernel, Docker, containerd, Ignition, etcd, or
  NVIDIA driver rows.
- Still links to `https://github.com/projectbluefin/server/releases`.
- Does not fetch `/server-versions.json`.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npx vitest run src/tests/serverVersion.test.ts
```

Expected: FAIL because the component still fetches stale data.

- [ ] **Step 3: Remove stale data consumption**

Replace the dynamic release panel with existing non-version release guidance.
Remove the NVIDIA chip fetch/render block from `ServerHighlights.vue`. Do not
replace the claims with GitHub release parsing or source-tree values.

- [ ] **Step 4: Search deletion references**

Run:

```bash
rg -n "server-versions\\.json|update-server-versions|nvidiaDrivers|streams\\.stable" .github scripts src public docs
```

Expected: no runtime, workflow, test, manifest, or generated-data references
remain; documentation may mention the retired source only as a prohibition.

- [ ] **Step 5: Run Server and shared rendering tests**

Run:

```bash
npx vitest run src/tests/serverVersion.test.ts src/tests/sectionPicker.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/server/ServerVersion.vue src/components/server/ServerHighlights.vue src/tests/serverVersion.test.ts docs/skills/content-maintenance/SKILL.md
git rm public/server-versions.json scripts/update-server-versions.js
git commit -m "fix(server): remove unverifiable version claims" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 8: Run daily verification and deduplicated alerts

**Files:**
- Modify: `.github/workflows/update-content.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/preview.yml`
- Modify: `scripts/tests/workflow-cache-parity.test.ts`
- Create: `scripts/tests/workflow-sbom-policy.test.ts`
- Create: `scripts/lib/sbom-issue-report.js`
- Create: `scripts/tests/sbom-issue-report.test.ts`

**Interfaces:**
- Consumes `npm run update:image-versions`.
- Produces issue title marker: `[SBOM verification] <product>: <failure-code>`
- Produces pure helper:

```js
export function buildSbomIssuePlan(audit, openIssues) {}
```

- [ ] **Step 1: Write workflow policy tests**

Parse `update-content.yml` and assert:

- Cron is `0 10 * * *`.
- Top-level permissions are `{}`.
- The update job grants only `contents: read`, `issues: write`, and
  `actions: write`.
- ORAS and Cosign setup actions are pinned to full commit SHAs.
- The workflow runs `npm run update:image-versions`.
- It does not run `update-stream-versions.js` or
  `update-dakota-versions.js` separately.
- The cache includes `.cache/website-live-data/sbom-audit.json`.

- [ ] **Step 2: Write issue-plan tests**

Given an audit with one `missing-sbom` failure, assert the plan creates or
updates exactly one issue containing image reference, immutable digest when
known, workflow URL, and last successful verification. Given a recovered audit,
assert it closes the matching issue with `state_reason: 'completed'`.

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npx vitest run scripts/tests/workflow-sbom-policy.test.ts scripts/tests/sbom-issue-report.test.ts scripts/tests/workflow-cache-parity.test.ts
```

Expected: FAIL because the daily workflow and report helper do not exist.

- [ ] **Step 4: Update workflow tooling and permissions**

Install pinned ORAS and Cosign setup actions. Keep existing action pins. Change
the schedule to daily and replace separate version commands with:

```yaml
- name: Verify image SBOMs and update version data
  run: npm run update:image-versions
```

After cache save and deployment trigger, use `actions/github-script` to load
`.cache/website-live-data/sbom-audit.json`, apply
`buildSbomIssuePlan()`, and create/update/close issues.

- [ ] **Step 5: Update cache parity**

Add `.cache/website-live-data/sbom-audit.json` to save and every restore list in
the same position. Extend `workflow-cache-parity.test.ts` to require it.

- [ ] **Step 6: Run workflow tests**

Run:

```bash
npx vitest run scripts/tests/workflow-sbom-policy.test.ts scripts/tests/sbom-issue-report.test.ts scripts/tests/workflow-cache-parity.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/update-content.yml .github/workflows/deploy.yml .github/workflows/preview.yml scripts/lib/sbom-issue-report.js scripts/tests/workflow-sbom-policy.test.ts scripts/tests/sbom-issue-report.test.ts scripts/tests/workflow-cache-parity.test.ts
git commit -m "ci(sbom): verify website image data daily" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 9: Validate live evidence and production routes

**Files:**
- Modify: `docs/skills/content-maintenance/SKILL.md`
- Modify: `docs/skills/validation/SKILL.md`
- Modify: `docs/reference/content-map.md`

**Interfaces:**
- Documents `npm run check:image-sboms` as the read-only live verification
  command and `npm run update:image-versions` as the generator.

- [ ] **Step 1: Run read-only live verification**

Run:

```bash
npm run check:image-sboms
```

Expected:

- Bluefin stable, Bluefin stable NVIDIA, Dakota, and Dakota NVIDIA report
  verified evidence.
- Missing Bluefin LTS/HWE SPDX referrers, missing Bluefin LTS NVIDIA stable
  evidence, and missing Dakota gaming SPDX referrers are recorded as evidence
  failures and their website fields are absent.
- No source-tree or documentation-cache requests occur.

- [ ] **Step 2: Run the full repository validation**

Run:

```bash
npm run lint
npm run typecheck
npm run test:gate
npm run build
```

Expected: all commands pass the repository gate.

- [ ] **Step 3: Exercise production entry points in Chromium**

Start exactly one server:

```bash
npm run dev -- --host :: --port 5173 --strictPort
```

Verify `/`, `/dakota/`, and `/server/` at desktop and mobile widths:

- No page errors.
- Bluefin and Dakota show only fields present in generated verified datasets.
- Missing optional NVIDIA/HWE/OGC fields do not render placeholders.
- Server shows no stale version rows.
- Download links remain functional.

- [ ] **Step 4: Update operating documentation**

Document:

- Registry ownership and how to add a field.
- Direct Bluefin and Dakota SBOM sources.
- Exact fail-closed behavior.
- Live check and regeneration commands.
- The rule that unavailable image evidence removes website claims.
- Context7 sources `/oras-project/oras`, `/sigstore/docs`, and
  `/ossf/scorecard`.

- [ ] **Step 5: Run documentation checks**

Run:

```bash
npm run check:docs
git diff --check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/skills/content-maintenance/SKILL.md docs/skills/validation/SKILL.md docs/reference/content-map.md
git commit -m "docs(sbom): document verified version pipeline" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 10: Request upstream signed SBOM coverage

**Files:**
- No repository files unless upstream issue URLs are added to an existing
  implementation PR description.

**Interfaces:**
- Produces upstream issues for missing gaming SPDX referrers, missing stable
  image channels, and signed SPDX attestations.

- [ ] **Step 1: Confirm existing upstream issues**

Search before creating:

```bash
gh issue list --repo projectbluefin/dakota --search '"SPDX SBOM" gaming'
gh issue list --repo projectbluefin/bluefin-lts --search '"SPDX SBOM"'
gh issue list --repo ublue-os/bluefin --search '"signed SBOM" attestation'
```

Reuse `https://github.com/projectbluefin/dakota/issues/1409` for missing Dakota
gaming SBOM referrers.

- [ ] **Step 2: File only missing owner-repository gaps**

Each issue must include the image tag and digest, `oras discover --format json`
output summary, expected artifact type, and the website field blocked by the
gap. Do not assign labels in repositories whose label scheme was not checked.

- [ ] **Step 3: Add implementation PR evidence**

The website PR description must list:

- Every live image/digest checked.
- Every optional field omitted and its upstream issue.
- The exact daily workflow test command.
- Chromium routes exercised.

- [ ] **Step 4: Final branch verification**

Run:

```bash
git status --short
git diff --check
npm run check:git-hygiene
```

Expected: only intentional branch changes remain, no stale worktrees or
unpublished clean branches exist, and git hygiene passes.
