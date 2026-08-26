# Download Card Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the “For the Wolves” cards to Dakota, Bluefin Server, Utah.

**Architecture:** Change the existing `wolvesDownloads` array order so DOM,
keyboard, and visual order remain aligned. Update the focused component test;
do not alter card markup, styling, copy, destinations, artwork, or version data.

**Tech Stack:** Vue 3, TypeScript, Vitest.

## Global Constraints

- Work only in `.worktrees/fix-download-pages`.
- Keep the change local; do not push or create a pull request.
- Preserve Dakota’s `/dakota/` link and version rows.
- Preserve Bluefin Server’s `/server/` link and zero version rows.
- Preserve Utah’s `https://devconf.us` link and zero version rows.

---

### Task 1: Reorder the download cards

**Files:**
- Modify: `src/tests/sectionPicker.test.ts`
- Modify: `src/components/sections/SectionPicker.vue`

**Interfaces:**
- Consumes: the existing `wolvesDownloads` computed array.
- Produces: card order Dakota → Bluefin Server → Utah.

- [ ] **Step 1: Change the expected order**

Update the test expectations to:

```ts
expect(cards.map(card => card.get('.card-title').text())).toEqual([
  'Dakota',
  'Bluefin Server',
  'Utah'
])
expect(cards.map(card => card.attributes('href'))).toEqual([
  '/dakota/',
  '/server/',
  'https://devconf.us'
])
expect(cards.map(card => card.get('.card-image').attributes('style'))).toEqual([
  expect.stringContaining('characters/dakota.webp'),
  expect.stringContaining('characters/alamosaurus.webp'),
  expect.stringContaining('characters/utah.webp')
])
```

- [ ] **Step 2: Verify the test fails**

Run:

```bash
npx vitest run src/tests/sectionPicker.test.ts --reporter=dot
```

Expected: the order test fails with Utah and Bluefin Server reversed.

- [ ] **Step 3: Reorder the data records**

Move the existing Bluefin Server object before the existing Utah object in
`wolvesDownloads`. Do not edit either object’s fields.

- [ ] **Step 4: Verify the focused test passes**

Run:

```bash
npx vitest run src/tests/sectionPicker.test.ts --reporter=dot
```

Expected: all SectionPicker tests pass.

- [ ] **Step 5: Verify the local render**

At desktop and mobile widths, assert the card titles are:

```text
Dakota
Bluefin Server
Utah
```

Confirm Dakota still has version rows and the other two cards do not.

- [ ] **Step 6: Commit locally**

```bash
git add src/components/sections/SectionPicker.vue src/tests/sectionPicker.test.ts
git commit -m "fix(downloads): move server card to middle" \
  -m "Assisted-by: GPT-5.6 Sol via GitHub Copilot CLI" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
