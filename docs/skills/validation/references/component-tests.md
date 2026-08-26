# Component test patterns

## Component test patterns

### Singleton-cached composables (`getDakotaVersions`)

`getDakotaVersions()` caches its result in a module-level promise. Once any
test triggers it, all subsequent tests in the same file receive the cached
value regardless of how `fetch` is stubbed. Stubbing `fetch` globally does not
help because the cache is above the network call.

Fix: use `vi.mock('../composables', ...)` to replace `getDakotaVersions` with a
per-test mock function. Reset it in `afterEach`. Vitest hoists `vi.mock` above
all imports, so a plain static `import Component from ...` is fine — no
`await import(...)` ordering dance is needed. Keep the factory's reference to
the mock function inside a closure (`() => mockFn()`) so nothing touches the
binding before the module body initialises it.

### Section components that inject `visibleSection`

Components using `SceneVisibilityChecker` inject a `visibleSection` writable
computed. Provide it when mounting:

```ts
global: { provide: { visibleSection: { value: '' } } }
```

### Components with child data-fetching

When a parent composes a child that fetches (e.g. `SectionNews` → `RssFeed`),
stub `fetch` globally so the child's `onMounted` does not hit the network.
Two moves keep that safe and meaningful:

- Restore with `vi.unstubAllGlobals()` in `afterEach`, never as the last
  statement of the test body — if an assertion throws, a body-level restore is
  skipped and the stub leaks into every later test in the file.
- `await flushPromises()` after `mount()` so the child's fetch settles inside
  the test, then assert the resulting state (e.g. fallback posts or an error
  message) rather than only stubbing and never checking the outcome.

### Components that fetch in `onMounted`

For a component that calls global `fetch` directly (e.g. `RssFeed`,
`ServerVersion`, `ImageChooser`), `vi.stubGlobal('fetch', ...)` plus
`flushPromises()` covers the success, rejection, and non-ok paths. Two extra
moves pin the states in between:

- A never-resolving promise (`vi.fn(() => new Promise(() => {}))`) asserts the
  loading state without racing the fetch.
- Assert the mock's call arguments (`expect(fetchMock).toHaveBeenCalledWith(url,
  expect.objectContaining({ mode: 'cors' }))`) to prove the request shape and
  that no real network call escaped.

### Locale-driven labels

Switch locale with `setLocale()` from `../composables/useLocale` and reset to
`en-US` in `afterEach` — the `i18n` instance is shared across the whole test
file. Components calling `t()` in the template (e.g. `Navigation`) react to a
post-mount switch; components calling `t()` in `<script setup>` to build plain
arrays (e.g. `TopNavbar`'s link lists) capture the locale at mount, so call
`setLocale()` **before** `mount()`.

### Scroll geometry in happy-dom

Scroll handlers read `window.scrollY`, `window.innerHeight`, and
`documentElement.scrollHeight`, which happy-dom leaves at `0`/`768`/`0`. Drive
both branches of a scroll handler with `Object.defineProperty(...,
{ value, configurable: true })` and restore the defaults in `afterEach` so the
overrides cannot leak into the next test.

### CSS pseudo-selectors in test-utils

This repo's tests run in **happy-dom** (`vite.config.ts` →
`test.environment: 'happy-dom'`), not jsdom. Descendant selectors with
structural pseudo-classes such as `.parent:first-of-type .child` resolve
correctly there (verified 2026-08-10, vitest 4.1.7 + happy-dom: the selector
matched exactly the first parent's child). Indexing into
`.findAll('.parent')` remains a readability choice, not a workaround.

### Vitest in linked worktrees

Do not exclude `**/.worktrees/**` unconditionally in the Vitest config. When the
cwd itself is a linked worktree, that pattern can hide every test file from a
normal `npx vitest run <file>` invocation. Gate the exclusion on `process.cwd()`
so root-checkout runs still skip nested worktrees while the current worktree
remains testable.

---

Procedure and gate: [`../SKILL.md`](../SKILL.md).
