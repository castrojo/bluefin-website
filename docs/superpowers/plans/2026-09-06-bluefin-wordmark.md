# Bluefin Wordmark Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import optimized Bluefin wordmark SVGs with transparent backgrounds, integrate into the website's hero and navbar, and verify via local dev server preview.

**Architecture:** Download SVGs from `delphicmelody/bluefin-graphics`, strip solid `<rect>` elements to achieve transparency, save as `bluefin-wordmark.svg` (default dark/white text) and `bluefin-wordmark-light.svg` in `public/brands/`. Update `SceneLanding.vue` and `TopNavbar.vue` to reference the wordmark, update SCSS, and verify visually with the local Vite dev server.

**Tech Stack:** Vue 3, Vite, TypeScript, SCSS, SVG.

## Global Constraints
- Target repo: `projectbluefin/website` (at `/var/home/jorge/src/website`).
- Wordmark name: `bluefin-wordmark`.
- Transparency: Solid `<rect>` backgrounds must be stripped so SVGs overlay cleanly.
- Do not push before local human preview and approval.

---

### Task 1: Sourcing and Preparing Wordmark Assets

**Files:**
- Create: `public/brands/bluefin-wordmark.svg`
- Create: `public/brands/bluefin-wordmark-dark.svg`
- Create: `public/brands/bluefin-wordmark-light.svg`
- Test: `tests/wordmark-assets.test.mjs`

**Interfaces:**
- Consumes: Remote SVGs from `https://raw.githubusercontent.com/delphicmelody/bluefin-graphics/main/logos/main/new/optimized/`
- Produces: Transparent SVGs in `public/brands/` with `viewBox="0 0 105.658 43.183"`.

- [ ] **Step 1: Write asset validation test**

Create `tests/wordmark-assets.test.mjs`:
```javascript
import { readFileSync, existsSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

describe('Wordmark Assets', () => {
  const files = [
    'public/brands/bluefin-wordmark.svg',
    'public/brands/bluefin-wordmark-dark.svg',
    'public/brands/bluefin-wordmark-light.svg',
  ]

  for (const file of files) {
    it(`verifies ${file} exists and has transparent background`, () => {
      expect(existsSync(file)).toBe(true)
      const content = readFileSync(file, 'utf-8')
      expect(content).toContain('viewBox="0 0 105.658 43.183"')
      expect(content).not.toMatch(/<rect\s+width="105\.658"/)
      expect(content).toContain('#4285f4')
    })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /var/home/jorge/src/website && npx vitest run tests/wordmark-assets.test.mjs`
Expected: FAIL (files do not exist yet)

- [ ] **Step 3: Download and process SVGs**

Download dark and light optimized SVGs, strip `<rect ... />` elements, and write to `public/brands/`:
```bash
python3 -c '
import urllib.request, re

base_url = "https://raw.githubusercontent.com/delphicmelody/bluefin-graphics/main/logos/main/new/optimized/"

# Dark variant
req = urllib.request.urlopen(base_url + "bluefin-new-dark-optimized.svg")
dark_svg = req.read().decode("utf-8")
dark_svg_clean = re.sub(r"<rect\s+[^>]*/>", "", dark_svg)

with open("/var/home/jorge/src/website/public/brands/bluefin-wordmark.svg", "w") as f:
    f.write(dark_svg_clean)
with open("/var/home/jorge/src/website/public/brands/bluefin-wordmark-dark.svg", "w") as f:
    f.write(dark_svg_clean)

# Light variant
req = urllib.request.urlopen(base_url + "bluefin-new-light-optimized.svg")
light_svg = req.read().decode("utf-8")
light_svg_clean = re.sub(r"<rect\s+[^>]*/>", "", light_svg)

with open("/var/home/jorge/src/website/public/brands/bluefin-wordmark-light.svg", "w") as f:
    f.write(light_svg_clean)
print("Assets written successfully")
'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /var/home/jorge/src/website && npx vitest run tests/wordmark-assets.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /var/home/jorge/src/website
git add public/brands/bluefin-wordmark*.svg tests/wordmark-assets.test.mjs
git commit -m "feat(assets): add optimized transparent bluefin-wordmark SVGs

Assisted-by: Gemini 3.8 Flash via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Update Hero Landing Scene

**Files:**
- Modify: `src/components/scenes/SceneLanding.vue:60-70`

**Interfaces:**
- Consumes: `/brands/bluefin-wordmark.svg`
- Produces: Updated hero branding

- [ ] **Step 1: Check existing test suite**

Run: `cd /var/home/jorge/src/website && npm run test:run`
Expected: Existing tests pass.

- [ ] **Step 2: Update SceneLanding.vue**

Replace `/brands/bluefin.svg` with `/brands/bluefin-wordmark.svg`:
```vue
          <img
            style="width: 100%; height: auto"
            width="105"
            height="43"
            src="/brands/bluefin-wordmark.svg"
            fetchpriority="high"
            alt="Bluefin"
          >
```

- [ ] **Step 3: Run typecheck and tests**

Run: `cd /var/home/jorge/src/website && npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /var/home/jorge/src/website
git add src/components/scenes/SceneLanding.vue
git commit -m "feat(landing): use new bluefin-wordmark in hero section

Assisted-by: Gemini 3.8 Flash via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Update Top Navbar

**Files:**
- Modify: `src/components/TopNavbar.vue:60-70`
- Modify: `src/style/app/_topnavbar.scss`

**Interfaces:**
- Consumes: `/brands/bluefin-wordmark.svg`
- Produces: Integrated wordmark in navigation bar

- [ ] **Step 1: Update TopNavbar.vue**

Replace `<b class="navbar__title text--truncate">Bluefin</b>` with the wordmark image:
```vue
        <a href="https://projectbluefin.io" class="navbar__brand">
          <div class="navbar__logo">
            <img src="/img/logo.svg" alt="Bluefin" loading="eager">
          </div>
          <img
            src="/brands/bluefin-wordmark.svg"
            alt="Bluefin"
            class="navbar__wordmark"
            loading="eager"
          >
        </a>
```

- [ ] **Step 2: Add styling in _topnavbar.scss**

Ensure `.navbar__wordmark` has appropriate dimensions matching the navbar height:
```scss
.navbar__wordmark {
  height: 2.2rem;
  width: auto;
  margin-left: 0.8rem;
  display: block;
}
```

- [ ] **Step 3: Run typecheck and tests**

Run: `cd /var/home/jorge/src/website && npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /var/home/jorge/src/website
git add src/components/TopNavbar.vue src/style/app/_topnavbar.scss
git commit -m "feat(navbar): display bluefin-wordmark in top navigation

Assisted-by: Gemini 3.8 Flash via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Local Preview & Visual Verification

**Files:**
- Test: Local browser preview on `http://localhost:5173`

- [ ] **Step 1: Start Vite dev server in background**

Run: `npm run dev` with mode `async`
Verify server prints `Local: http://localhost:5173/`

- [ ] **Step 2: Verify HTTP response and DevTools rendering**

Run: `curl -s http://localhost:5173 | grep -E "bluefin-wordmark"`
Check console errors and inspect page state.

- [ ] **Step 3: Present preview URL to user for review before any git push**
