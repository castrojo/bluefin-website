# Director's Cut intro

How the Director's Cut intro is composed, and how content is kept out of the standard show. Loaded from the `wolves-content` skill when touching either intro variant.

Back to [`../SKILL.md`](../SKILL.md).

## Director's Cut does not share the standard intro's title-card quote slide

`buildIntroVideoSequence()` is the standard front-door intro: silent title-card
quote slide, then the Destiny trailer. The Director's Cut replaces that opening
with the scored prologue (`uvtR84x0kgw`, *Excerpt from The Tribulation*,
134.65 s), but it still ends with the same Destiny trailer.

Do not build the Director's Cut by prepending the prologue to
`...buildIntroVideoSequence()`. That places the standard title-card quote slide
after the prologue, so the show appears to return to the opening after the first
song has already played. Instead, compose the Director's Cut from its own
opening segment plus the shared Destiny trailer segment, keeping the two intro
variants as sibling lists rather than a prefix plus a spread.

When either intro list changes, update the store tests that assert on segment
identity and duration rather than on segment count, since both variants now have
the same length.

## Registering content that must never reach the standard show

Some records exist only for the Director's Cut and must never be scheduled by
the standard timeline, which is a different guarantee than the existing
oversubscription cuts in `hiddenFromWolvesVideoArtifactIds` (see
[`../../../reference/wolves-lore-timing.md`](../../../reference/wolves-lore-timing.md)).
An oversubscription cut is reversible curation of records that *are* authored
for the standard show; a Director-only record was never authored for it at
all. Both currently live in the same exclusion set, so label each addition
with its own comment block naming its reason — a future reader must not
assume the whole set shares one cause, or "restore" a Director-only record
into the standard show believing it is an oversubscription fix.

The pattern for one owner-approved batch of Director-only records (the
nine-quote science/humanity panel):

1. One Markdown lore file per record, same frontmatter shape and body
   convention as any other record of that `kind` (a `quote` record's body is
   the bare quote text, straight apostrophes, no wrapping quote-mark
   characters — the view renders its own decorative opening mark).
2. Register each in `loreManifest` (`wolves-lore-records.ts`) with the
   chapter id that marks them Director-only (`directors-cut` for this batch),
   not an existing story chapter.
3. Add every new id to `hiddenFromWolvesVideoArtifactIds`
   (`wolves-narrative-timeline.ts`) in its own labeled block. This is the
   entire mechanism that keeps the standard show unaware the records exist;
   nothing else needs to change for the standard show to stay correct.
4. `sourceUrlsByRecordId` (`wolves-story.ts`) accepts a source URL for any
   lore `kind`, not only `kind: 'source'` — register one entry per new record
   there too if the record has independently verifiable provenance.
4a. For a quote panel specifically, also register a typed evidence record per
   quote in `src/data/wolves-directors-cut-quote-evidence.ts`: attribution,
   work, edition/publication, locator, exact source URL, copyright status, and
   a `verificationConfidence` (`primary-print-scan` for a Google
   Books/archive.org page image of the physical edition,
   `primary-web-publication` for the author/org's own first-party web page,
   `official-secondary-reproduction` for an authoritative third party
   reproducing the passage without a print scan of their own). This is the
   single typed authority the sourceUrl tests compare against for exact
   values, not just URL shape — do not let `wolves-story.ts`'s map and this
   ledger's `sourceUrl` field drift to different URLs for the same id.
   Candidate quotes researched but not owner-approved for the ledger (in this
   batch: Dune and Tolkien excerpts) stay excluded — neither is public domain
   and no written estate permission was recorded.
5. Give the batch its own timeline module (`wolves-directors-cut-timeline.ts`)
   rather than teaching the standard scheduler about a second show. It reuses
   the existing `allocateLoreSlots()`/`estimateLoreReadDuration()` primitives
   unmodified; only the window boundaries and the records fed into them are
   new.

To size quote windows from approved musical sections rather than equal
arbitrary slices (a requirement, not a style preference — see "Timeline
oversubscription math" in
[`../../../reference/wolves-lore-timing.md`](../../../reference/wolves-lore-timing.md)),
partition proportionally to each window's own measured length using a
largest-remainder allocation (assign each window `floor(share)`, then hand out
the leftover items to the windows with the largest fractional remainders
first). This keeps the item count tied to what the music actually offers
instead of splitting a fixed list into equal groups regardless of the section
underneath them.

**Verify every reading-cost estimate against the real timing functions before
trusting it, never by hand.** A hand-computed estimate for the existing
missing-scientist bulletin (roughly 49.5s across 3 pages, by counting authored
paragraph blocks) was wrong by about 10 seconds and 4 pages against the real
`loreProsePages()`/`estimatePageSeconds()` output (59.500s across 7 pages),
because `splitOversizedBlocks()` further divides any block that does not fit
`PROSE_PAGE_CHARACTERS - BLOCK_OVERHEAD_CHARACTERS` into finer "readable
beats" — a per-paragraph count undercounts the real page count it produces.
Import and call the actual functions from a throwaway script (delete it
afterward; never commit it and never write it under `/tmp`) against the real
file content before committing to a window boundary, especially when a
window's margin over its ideal cost is the thing that decides whether new
content fits at all.
