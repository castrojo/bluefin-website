# Download Card Order Design

## Goal

Change the front-page “For the Wolves” card order to:

1. Dakota
2. Bluefin Server
3. Utah

## Design

Reorder the existing records in `wolvesDownloads` inside
`src/components/sections/SectionPicker.vue`. Do not change card markup, copy,
links, artwork, version data, styles, or responsive behavior.

Update `src/tests/sectionPicker.test.ts` so DOM order, destinations, and artwork
expectations match the new visual order. Keeping the array, DOM, keyboard, and
visual order aligned avoids CSS-only ordering.

## Verification

- The focused SectionPicker test passes.
- Desktop and mobile local renders show Dakota → Bluefin Server → Utah.
- Dakota remains the only card with version rows.
