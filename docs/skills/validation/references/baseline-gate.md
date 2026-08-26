# The baseline gate

`npm run test:gate` is the repository's local regression signal. It runs the
suite, compares failing test identities with `tests/known-failures.txt`, and
fails only when the current run introduces a failure outside that recorded
set.

Derive the baseline from source:

```bash
wc -l tests/known-failures.txt
npm run test:gate
```

Never trust a count written in prose. Never run `test:gate:update` to hide a
failure caused by the current change.

## CI is stricter

The PR test job in `.github/workflows/ci.yml` runs:

```bash
npm run check:docs
npm run lint
npm run typecheck
npm run test:run -- --coverage
npm run build
```

`tests/known-failures.txt` does not alter that coverage run. A non-empty
baseline can therefore pass the local gate while CI remains red. When changing
tests, coverage, or CI, run the exact CI invocation as well as `test:gate`.

## Coverage invariants

- `coverage.include: ['src/**']` keeps unimported source files visible at 0%.
- Glob thresholds apply to the aggregate of the matched files.
- Set thresholds below the lowest measured value on supported Node versions;
  v8 coverage can vary by runtime version.
- Use `CI=true npm run test:run -- --coverage` when reproducing CI. Some
  live-network tests are gated by `process.env.CI`.

## Baseline entries

Each line is:

```text
<test file path> :: <full describe and test name>
```

Entries are sorted by `scripts/test-baseline.mjs`. When a recorded failure is
repaired, remove exactly that line in the same change and prove the smaller
baseline with `npm run test:gate`.

---

Procedure and gate: [`../SKILL.md`](../SKILL.md).
