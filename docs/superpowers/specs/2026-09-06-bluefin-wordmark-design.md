# Bluefin Wordmark Integration Design

## Context & Goal
Project Bluefin has a new optimized wordmark available in `delphicmelody/bluefin-graphics` (`logos/main/new/optimized/`). The goal is to import the new wordmark as `bluefin-wordmark`, make it available in the website repository, integrate it into the hero landing section and top navigation bar, and preview it locally to verify visual quality and alignment before pushing.

## Assets Sourcing & Formatting
- **Source**: `https://github.com/delphicmelody/bluefin-graphics/tree/main/logos/main/new/optimized`
  - `bluefin-new-dark-optimized.svg`
  - `bluefin-new-light-optimized.svg`
- **Destination**:
  - `public/brands/bluefin-wordmark.svg`: Default dark variant (white lettering, `#4285f4` fin), transparent background (strip top-level solid `<rect>`).
  - `public/brands/bluefin-wordmark-dark.svg`: Exact copy of default dark variant for explicit mode referencing.
  - `public/brands/bluefin-wordmark-light.svg`: Light variant (black lettering, `#4285f4` fin), transparent background (strip top-level solid `<rect>`).
- **Dimensions & Aspect Ratio**:
  - `viewBox="0 0 105.658 43.183"` matches the existing `brands/bluefin.svg` aspect ratio (approx 2.45:1).

## Component Integration
1. **Landing Hero (`src/components/scenes/SceneLanding.vue`)**:
   - Update image source from `/brands/bluefin.svg` to `/brands/bluefin-wordmark.svg`.
   - Update alt text from "Project Bluefin" to "Bluefin".
   - Keep width/height ratio (105x43) and animations intact.
2. **Top Navigation (`src/components/TopNavbar.vue`)**:
   - Replace the plain text title `<b class="navbar__title text--truncate">Bluefin</b>` with `<img src="/brands/bluefin-wordmark.svg" alt="Bluefin" class="navbar__wordmark">` alongside the existing logo mark icon (`/img/logo.svg`).
   - Add styling in `_topnavbar.scss` for `.navbar__wordmark` (height constrained to match navbar line-height ~24-28px, auto width, vertically aligned).

## Verification & Local Preview
1. Start local Vite dev server via `npm run dev`.
2. Open local URL (default `http://localhost:5173`) in browser or inspect via Chrome DevTools.
3. Validate:
   - Hero wordmark renders cleanly on top of parallax sky without background artifacts.
   - Navbar wordmark is crisply scaled, vertically aligned, and mobile responsive.
   - No console errors or TypeScript compilation regressions.
