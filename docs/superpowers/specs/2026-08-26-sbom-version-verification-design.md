# SBOM-Verified Website Version Data

## Goal

Every package or operating-system version displayed by the website for an
image-backed product must be checked directly against that product's published
OCI image SBOM every day.

The website must never infer a shipped version from source files, release notes,
another product, or yesterday's generated data. If a field cannot be verified,
it is omitted and automation alerts.

## Scope

Included:

- Bluefin stable and LTS streams and the image variants that supply displayed
  kernel, desktop, graphics, HWE, and NVIDIA fields.
- Dakota base, NVIDIA, gaming, and NVIDIA gaming variants.
- Every current and future website field registered as image-backed version
  data.

Excluded until they publish images:

- Bluefin Server. Its stale Flatcar-derived version data must be retired
  separately. It enters this system only after a published Server image has a
  usable SPDX SBOM.
- Non-version website content such as prose, artwork, photos, and download URLs.

## Chosen Architecture

Use one declarative image registry and one shared direct-SBOM collector.

Each registry entry defines:

- Product and variant identifier.
- OCI repository and moving tag.
- Expected publisher identity and GitHub Actions OIDC issuer.
- Required OCI artifact types.
- Package-to-output-field mappings.
- Whether each field is required or optional.
- Output projection: Bluefin streams, Dakota, or a future product.
- Maximum acceptable age. **Resolved during implementation as evidence
  freshness, not image age — see Implementation Notes.**

The collector resolves every moving tag to an immutable digest before doing any
other work. All discovery, provenance verification, SBOM retrieval, extraction,
and audit records use that digest.

## Supply-Chain Trust

Use established ecosystem tooling:

- ORAS discovers OCI referrers and pulls
  `application/vnd.spdx+json` artifacts.
- Sigstore/Cosign verifies the image's SLSA provenance bundle using exact
  certificate identity and OIDC issuer constraints.
- OpenSSF workflow guidance supplies the CI baseline: least-privilege token
  permissions and actions pinned by commit SHA.

Current Bluefin and Dakota images attach a raw SPDX referrer and a Sigstore SLSA
provenance bundle to the same image digest. Phase 1 verifies the image
provenance, then consumes the subject-bound SPDX referrer. Phase 2 requires
publishers to attach signed SPDX attestations and verifies the SBOM attestation
directly.

Registry association is not treated as permission to accept an arbitrary
publisher. Verification policy is explicit per image family.

## Components

### Image registry

A small reviewed data file owns all image/tag and package mappings. Components
and output generators do not carry their own package-name maps.

Adding a displayed version requires adding a registry mapping and tests in the
same change. An unregistered version field is invalid.

### OCI client

A shared module:

1. Resolves a tag to an image digest.
2. Discovers the digest's referrers with ORAS.
3. Selects the required provenance and SPDX artifacts by exact artifact type.
4. Invokes Cosign verification with the registry entry's identity policy.
5. Pulls and parses the SPDX document.
6. Returns the immutable image digest, SBOM digest, verified identity, and SPDX
   package records.

It does not know website output schemas.

### SPDX extractor

The extractor resolves package versions by both package name and BuildStream
element provenance where necessary. It must not choose the highest version
across unrelated elements merely because they share a package name.

Extraction returns:

- Verified fields.
- Missing required fields.
- Missing optional fields.
- Ambiguous matches.
- Rejected non-version values.

Ambiguity is a failure, not a sorting problem.

### Product projections

Bluefin and Dakota adapters transform verified extraction results into the
existing public data shapes so front-end migration is minimal:

- `public/stream-versions.yml`
- `public/dakota-versions.json`

Generated files include provenance metadata where their schemas permit it:

- Image reference.
- Image digest.
- SBOM digest.
- Verification timestamp.

A separate non-public audit report contains full per-image evidence.

### Workflow

The live-data workflow runs daily after expected image publication windows and
supports manual dispatch.

It:

1. Installs pinned ORAS and Cosign tooling.
2. Processes every registry entry.
3. Validates normalized results and output schemas.
4. Writes outputs to a temporary directory.
5. Compares the new field set with the previous successful run.
6. Converts evidence failures into explicit unavailable product projections
   with no version fields.
7. Atomically promotes the verified and sanitized outputs.
8. Saves generated data and its audit report under one matching cache path
   list.
9. Triggers deployment.

The deployment and preview workflows restore the same cache path list in the
same order.

## Bluefin Migration

Bluefin stops using
`https://docs.projectbluefin.io/data/sbom-attestations.json` as its version
source.

The registry directly covers every image currently contributing a displayed
Bluefin field, including stable, LTS, HWE, and NVIDIA variants. The generated
stream file remains the UI contract, but every value gains direct image-digest
evidence from the daily run.

No literal `"unknown"` values are generated. Unverified optional fields are
omitted; missing required fields fail the Bluefin projection.

## Dakota Migration

Dakota base and NVIDIA mappings move into the shared registry and collector.
Gaming variants are registered immediately but remain failing until they
publish SPDX referrers.

The OGC kernel field is displayed only when a gaming image SBOM identifies the
`linux-ogc` build element and its shipped version. It is never copied from the
NVIDIA driver or inferred from the Dakota source tree.

## Failure Policy

The system fails closed.

- Missing SBOM: mark that product unavailable and remove its version fields.
- Invalid provenance identity: mark that product unavailable and remove its
  version fields.
- Missing required package: mark that product unavailable and remove its
  version fields.
- Missing optional package: omit the field and record it.
- Ambiguous package match: mark that product unavailable and remove its version
  fields.
- Stale evidence: the daily run stamps `checkedAt` on every audit entry and
  every generated file, so freshness is observable directly. Image publication
  age is not used as a proxy — see Implementation Notes.
- Registry/schema mismatch: fail before writing outputs.
- Large unexplained field loss without a matching evidence failure: fail the
  diff guard.

An evidence failure produces a sanitized dataset and deployment that removes
the affected version fields from the website. The previous production cache is
not reused as current truth. A failure in the checker itself, registry parsing,
or output schema blocks deployment because the system cannot safely distinguish
missing evidence from broken verification.

One deduplicated issue per product/failure class is opened or updated with the
workflow URL, image reference, image digest, missing evidence, and last
successful verification. Recovery closes the issue with `state_reason:
completed`.

## Tests

### Unit tests

- Tag resolution is converted to an immutable digest.
- Artifact selection requires exact artifact types.
- Publisher identity and issuer policy are required.
- Duplicate package names from different BuildStream elements do not conflate.
- Hash refs and malformed versions are rejected.
- Required, optional, missing, and ambiguous mappings behave as specified.
- Product projections omit unverified optional fields and reject missing
  required fields.
- Previous generated fields cannot leak into a new result.

### Fixture integration tests

Captured, non-secret ORAS discovery documents and SPDX fixtures cover:

- Bluefin stable.
- Bluefin LTS and HWE.
- Dakota base and NVIDIA.
- A gaming image with no SPDX referrer.
- A future gaming SPDX fixture containing `linux-ogc`.
- Wrong publisher identity.

Tests replay the full collector without registry or network access and compare
normalized output snapshots.

### Live smoke test

A scheduled and manually runnable check resolves every configured live tag,
verifies provenance, confirms expected referrers, and validates mappings
without changing production files.

### Browser tests

The affected routes assert:

- Displayed values exist in the generated verified dataset.
- Omitted fields do not render placeholder or stale rows.
- No page errors occur when optional fields are absent.

## Rollout

1. Add the registry, shared OCI client, SPDX extractor, schemas, and fixtures.
2. Migrate Dakota and prove parity for fields its current SBOMs support.
3. Migrate every Bluefin stream field from the documentation cache to direct
   image SBOMs.
4. Add daily live verification, audit output, diff guard, and deduplicated
   failure issues.
5. Register gaming variants and keep OGC fail-closed until their SPDX
   publication is available.
6. Retire stale Server version rendering until Server publishes an image SBOM.
7. Coordinate signed SPDX attestations upstream, then require direct Cosign
   verification of SBOM attestations.

## Success Criteria

- Every displayed image-backed version has current image digest and SBOM digest
  evidence from a run less than 24 hours old.
- Bluefin uses direct published image SBOMs, not the documentation cache.
- No generator retains a field absent from the current verified SBOM.
- Missing or ambiguous evidence cannot silently reach deployment.
- Daily failures create actionable, deduplicated alerts.
- Existing Bluefin and Dakota routes render correctly when optional fields are
  omitted.

## Implementation Notes

### Maximum acceptable age resolves to `checkedAt`

The registry has no image-age threshold and must not gain one.

What has to be fresh is the *evidence*: the daily workflow re-verifies every
image and records `checkedAt` on each audit entry and on both public files, so
"verified today" is a fact in the data rather than an inference from a
constant.

Image publication age measures release cadence instead. A stable image that has
not been rebuilt for weeks because nothing changed is correct, and failing it
would delete accurate version data from the website and open an issue no one
can act on. Any number chosen here would be invented rather than derived from
an upstream contract, and the first release freeze would train everyone to
ignore the resulting alerts.

If upstream publishes a rebuild SLA, that SLA becomes the threshold.

### Degraded is an audit status, not a public one

The public files keep the two-value `verified` / `unavailable` contract that
`ImageChooser.vue` and `DakotaVersionCard.vue` already gate on. An image whose
optional evidence did not resolve is `degraded` in the audit: its verified
values are still published, the unresolved fields are simply absent, and an
issue is opened. Publishing a third status string would be a component
behaviour change.

### Tooling failure is not evidence failure

`EvidenceError` means the publisher did not publish; it sanitizes fields and
alerts. `ToolingError` means verification could not run — missing binary,
timeout, throttled or unreachable registry, malformed tool output — and aborts
before any output, cache, or deployment. Unrecognised tool failures are treated
as tooling failures, because "absent" and "unreachable" cannot be told apart
and only one of them is safe to publish.

### Pending mappings never verify

A record with `pendingSbom: true` or an empty `packages` map stays
`unavailable` with `pending-mapping` even after its image starts publishing an
SPDX referrer. Publication is not a mapping: someone still has to decide which
package names back which website fields. Its issue therefore stays open, and
the resolved digests are recorded so the new artifact can be inspected.

## Sources

- ORAS referrer discovery and JSON output: Context7 `/oras-project/oras`
- Sigstore/Cosign verification: Context7 `/sigstore/docs`
- OpenSSF Scorecard workflow hardening: Context7 `/ossf/scorecard`
