# TV App UX Audit Fixes

## Context

A 10-foot UI audit of the KinoPub Tizen app revealed several readability and usability issues that affect couch-distance viewing on Samsung TVs. The three critical findings are: (1) many text elements fall below the 24px minimum for TV readability, (2) focus indicators are inconsistent — some components use outline-only, others background-only, making it hard to tell what's focused from 3 meters, and (3) focus restoration is missing on several navigation paths, causing disorienting focus jumps when pressing Back.

Medium-priority issues include no debouncing on remote key events (rapid-fire key repeats cause jank on slow TV CPUs) and missing scroll animations on grid views.

## Approach

**Font sizes:** Bump all sub-24px text to at least 24px. Sidebar labels go to 24px, PosterCard title to 24px, year/rating to 24px, episode metadata to 24px, progress bar time to 24px, content page meta/genres/plot/cast to 24px minimum. No layout changes needed — the text just gets slightly larger in its existing containers.

**Focus indicators:** Standardize on a two-layer approach: 3px solid `#4a9eff` outline (visible from couch distance) + optional background highlight for extra emphasis. Remove all `outline: none` from focused states. Components that currently rely on background-only focus get an outline added.

**Focus restoration:** Create a `navigateWithFocus()` helper in the UI store that auto-captures the current focus key before pushing to the navigation stack. Replace all bare `navigate()` calls with this helper. Fix Sidebar and ContentPage→Player navigation specifically.

**Key debouncing:** Add a 150ms throttle wrapper for navigation key handlers in `useRemoteKeys`. Media keys (play/pause/stop) should NOT be throttled — only directional navigation (arrows, Enter, Back).

**Grid scroll animation:** Add `transition: transform 200ms ease-out` to the grid containers on HomePage and SearchPage that currently jump instantly.

## Files

### New files

- `src/hooks/useThrottledKey.ts` — throttle wrapper for navigation key events (150ms default)

### Modified files

**Font size fixes:**
- `src/components/Sidebar.module.css` — bump label from 13px to 24px
- `src/components/PosterCard.module.css` — bump title 20→24px, year 16→24px, rating 14→24px
- `src/components/EpisodeList.module.css` — bump episode number 18→24px, duration 18→24px, season tab 22→24px
- `src/components/Player/ProgressBar.module.css` — bump time 22→24px
- `src/pages/ContentPage.module.css` — bump meta 22→24px, genres 20→24px, plot 22→24px, cast 18→24px
- `src/components/Player/PlayerOverlay.module.css` — bump tracks button 22→24px
- `src/pages/BookmarksPage.module.css` — bump folder count 22→24px

**Focus indicator fixes:**
- `src/components/EpisodeList.module.css` — add outline to `.seasonTabFocused` and `.episodeRowFocused`
- `src/components/Player/PlayerOverlay.module.css` — add outline to `.playPauseFocused` and `.tracksButtonFocused`, remove `outline: none`
- `src/components/Player/TrackPicker.module.css` — add outline to `.itemFocused`, remove `outline: none`
- `src/pages/ContentPage.module.css` — add outline to `.actionButtonFocused`

**Focus restoration:**
- `src/store/ui.ts` — add `navigateWithFocus()` action that captures current focus key before pushing
- `src/pages/ContentPage.tsx` — pass `lastFocusKey` when navigating to player
- `src/components/Sidebar.tsx` — pass `lastFocusKey` when navigating between sections

**Key debouncing:**
- `src/hooks/useRemoteKeys.ts` — integrate throttle for directional/navigation keys

**Grid scroll animation:**
- `src/pages/HomePage.module.css` — add `transition: transform 200ms ease-out` to grid container
- `src/pages/SearchPage.module.css` — add `transition: transform 200ms ease-out` to grid container

## Tasks

### Task 1: Fix all sub-24px font sizes

Bump every text element below 24px to the TV minimum. These are pure CSS changes — no layout restructuring needed.

- [x] `src/components/Sidebar.module.css`: change `.label` font-size from `13px` to `24px` (line 67)
- [x] `src/components/PosterCard.module.css`: change `.title` font-size from `20px` to `24px` (line 50)
- [x] `src/components/PosterCard.module.css`: change `.year` font-size from `16px` to `24px` (line 65)
- [x] `src/components/PosterCard.module.css`: change `.ratingBadge` font-size from `14px` to `24px` (line 75)
- [x] `src/components/EpisodeList.module.css`: change `.seasonTab` font-size from `22px` to `24px` (line 17)
- [x] `src/components/EpisodeList.module.css`: change `.episodeNumber` font-size from `18px` to `24px` (line 89)
- [x] `src/components/EpisodeList.module.css`: change `.episodeDuration` font-size from `18px` to `24px` (line 108)
- [x] `src/components/Player/ProgressBar.module.css`: change time font-size from `22px` to `24px` (line 10)
- [x] `src/pages/ContentPage.module.css`: change `.metaItem` font-size from `22px` to `24px` (line 83)
- [x] `src/pages/ContentPage.module.css`: change `.genres` font-size from `20px` to `24px` (line 98)
- [x] `src/pages/ContentPage.module.css`: change `.plot` font-size from `22px` to `24px` (line 104)
- [x] `src/pages/ContentPage.module.css`: change `.cast` font-size from `18px` to `24px` (line 115)
- [x] `src/components/Player/PlayerOverlay.module.css`: change `.tracksButton` font-size from `22px` to `24px` (line 83)
- [x] `src/pages/BookmarksPage.module.css`: change `.folderCount` font-size from `22px` to `24px` (line 82)
- [x] Verify Sidebar layout still works with larger label text — label may need `overflow: hidden; text-overflow: ellipsis` if it overflows the collapsed sidebar width
- [x] Verify PosterCard layout — larger year/rating text may need card height adjustment or text truncation

**DoD:** `npm run typecheck && npm run lint && npm run build` passes. All text is 24px or above. No layout overflow or text clipping visible in Storybook or browser dev.

### Task 2: Standardize focus indicators on all interactive elements

Add consistent 3px outline to every focused state. Components that currently use background-only focus get an outline added. Components that use `outline: none` get it removed.

- [ ] `src/components/EpisodeList.module.css`: add `outline: 3px solid #4a9eff; outline-offset: -3px;` to `.seasonTabFocused` (keep existing `background-color` as supplement)
- [ ] `src/components/EpisodeList.module.css`: add `outline: 3px solid #4a9eff; outline-offset: -3px;` to `.episodeRowFocused` (keep existing `background-color` as supplement)
- [ ] `src/components/Player/PlayerOverlay.module.css`: remove `outline: none` from `.playPauseFocused` (line 69), add `outline: 3px solid #4a9eff; outline-offset: 2px;`
- [ ] `src/components/Player/PlayerOverlay.module.css`: remove `outline: none` from `.tracksButtonFocused` (line 102), add `outline: 3px solid #4a9eff; outline-offset: 2px;`
- [ ] `src/components/Player/TrackPicker.module.css`: remove `outline: none` from `.itemFocused` (line 53), add `outline: 3px solid #4a9eff; outline-offset: -3px;`
- [ ] `src/pages/ContentPage.module.css`: add `outline: 3px solid #4a9eff; outline-offset: 2px;` to `.actionButtonFocused` (keep existing `background-color`)
- [ ] `src/components/Sidebar.module.css`: change `.itemFocused` outline from `2px` to `3px` for consistency (line 42)
- [ ] `src/pages/SearchPage.module.css`: change `.inputWrapperFocused` outline from `2px` to `3px` for consistency
- [ ] `src/pages/BookmarksPage.module.css`: change `.backButtonFocused` and `.folderFocused` outlines from `2px` to `3px`

**DoD:** `npm run typecheck && npm run lint && npm run build` passes. Every focusable element shows a 3px blue outline when focused. No `outline: none` remains on any focused state class. Verify in browser with keyboard navigation.

### Task 3: Fix focus restoration on all navigation paths

Ensure every `navigate()` call captures the current focus key so pressing Back restores focus to the exact element.

- [ ] `src/store/ui.ts`: add a `navigateWithFocus` action that:
  1. Gets the current focused key via norigin's `getCurrentFocusKey()` (import from `@noriginmedia/norigin-spatial-navigation`)
  2. Calls the existing `navigate()` with the captured key as `lastFocusKey`
  3. Export it alongside the existing `navigate`
- [ ] `src/pages/ContentPage.tsx`: when navigating to PlayerPage (lines ~146, 155-164), use `navigateWithFocus` instead of bare `navigate` so focus returns to the play button or episode row on Back
- [ ] `src/components/Sidebar.tsx`: when navigating between sections (line ~64), use `navigateWithFocus` so focus returns to the correct sidebar item on Back
- [ ] `src/pages/SearchPage.tsx`: replace literal `'search-page'` with a named constant `SEARCH_PAGE_FOCUS_KEY` for consistency with other pages
- [ ] Verify: navigate Home → Content → Player → Back → Content (focus should be on play button) → Back → Home (focus should be on the card that was selected)

**DoD:** `npm run typecheck && npm run lint && npm run build` passes. Back navigation from Player restores focus to the play button on ContentPage. Back from any Sidebar navigation restores focus to the sidebar item.

### Task 4: Add throttle to remote key navigation events

Prevent rapid-fire key repeats from causing jank on slow TV CPUs. Only throttle navigation keys — media keys must remain instant.

- [ ] Create `src/hooks/useThrottledKey.ts`:
  ```typescript
  const NAVIGATION_KEYS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Enter', 'Backspace',
  ]);
  const THROTTLE_MS = 150;
  ```
  Export a `shouldThrottleKey(key: string, now: number): boolean` function that:
  - Returns `false` for non-navigation keys (media keys pass through immediately)
  - Returns `true` if the same key was handled within `THROTTLE_MS` ago
  - Uses a simple `lastKeyTime: Map<string, number>` to track per-key timestamps
- [ ] `src/hooks/useRemoteKeys.ts`: import `shouldThrottleKey`, add early return at the top of the `handleKeyDown` callback if `shouldThrottleKey` returns `true`
- [ ] Verify: hold down arrow key in browser dev — should navigate once per ~150ms, not every frame

**DoD:** `npm run typecheck && npm run lint && npm run build` passes. Holding an arrow key in browser causes smooth, throttled navigation at ~6-7 steps/second instead of flooding.

### Task 5: Add scroll animation to grid views

Grid containers on HomePage and SearchPage jump instantly when scrolling — add a smooth CSS transition.

- [ ] `src/pages/HomePage.module.css`: add `transition: transform 200ms ease-out;` to the `.railList` (or equivalent grid container class that uses `transform: translateY`)
- [ ] `src/pages/SearchPage.module.css`: add `transition: transform 200ms ease-out;` to the `.resultsGrid` (or equivalent class that uses `transform: translateY`)
- [ ] Verify: navigate up/down through content rails on HomePage — should see smooth sliding instead of instant jumps

**DoD:** `npm run typecheck && npm run lint && npm run build` passes. Vertical scrolling on HomePage and SearchPage animates smoothly over 200ms.

### Task 6: Final validation

Full build + manual verification across all changes.

- [ ] Run `npm run typecheck && npm run lint && npm run test && npm run build` — all must pass
- [ ] Run `npm run storybook` and verify:
  - PosterCard stories: text is readable, no overflow
  - Sidebar stories: labels are readable in both collapsed and expanded states
  - EpisodeList stories: episode metadata is readable
  - Focus states are clearly visible on all interactive components
- [ ] Browser dev manual check:
  - All text 24px+ (inspect via DevTools)
  - All focusable elements show 3px blue outline when focused
  - Back button restores focus correctly on all navigation paths
  - Holding arrow keys produces smooth throttled navigation
  - Grid scrolling animates smoothly
