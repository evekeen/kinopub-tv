# KinoPub Tizen — Standalone Samsung TV Streaming App

## Context

The KinoPub STV app (kpstv.net) fails to play video on Samsung TVs through VPN — Samsung's AVPlay API chokes on HLS4 streams with "prepare error". The app is closed-source (Svelte 3, no repo) with no way to change the stream protocol. A workaround using kp-msx proxy + Media Station X proves that using hls.js (JavaScript-based HLS player via MSE) instead of AVPlay fixes playback completely.

This project builds a standalone Tizen web app that talks directly to the kino.pub API and uses hls.js for playback — eliminating the need for any proxy server. The app clones KinoPub STV's UX: dark theme, left sidebar navigation, content rails, full-featured player with audio track and subtitle switching.

The GL.iNet VPN router is still required for video CDN geo-restriction bypass, but no Mac/proxy dependency.

## Approach

**Stack:** React 18 + TypeScript + Vite + CSS Modules + Zustand + hls.js (light UMD build) + @noriginmedia/norigin-spatial-navigation + @vitejs/plugin-legacy

**Key decisions:**
- **React over Svelte** — developer familiarity, strong spatial navigation library ecosystem
- **hls.js over AVPlay** — AVPlay fails with HLS4 through VPN; hls.js uses MSE which works on Tizen 2015+
- **hls.js light UMD build** (`hls.js/dist/hls.light.js`) — ESM build causes lockups on Tizen (hls.js#7106); light build excludes subtitle parsing (handled externally via SRT) and saves ~35KB gzipped
- **Use `url.hls` not `url.hls4`** — simpler HLS streams that hls.js handles reliably; HLS4 includes adaptive multi-track manifests that caused the original issue
- **CSS Modules over Tailwind** — Tailwind v3+ uses CSS custom properties (`--tw-*`) which require Chrome 49+; Chromium M47 (2017 TVs) does not support them, so every Tailwind color utility silently fails. CSS Modules have zero runtime, full M47 compatibility
- **@vitejs/plugin-legacy** — Vite's `build.target` only transpiles syntax; this plugin adds core-js polyfills for APIs missing in Chromium M47 (`Object.entries`, `Array.from`, `Promise.allSettled`, etc.)
- **Vite target `chrome47`** — not `es2015`; more precise esbuild targeting
- **Zustand over Redux** — ~1KB, minimal boilerplate, sufficient for this app's state complexity
- **No router library** — state-based screen switching (like KinoPub STV does), simpler for TV navigation
- **PlayerContext (singleton)** — owns the single `<video>` element and hls.js instance at App level; avoids MSE SourceBuffer detach/reattach race conditions when navigating in/out of player
- **Single `<video>` element** — MSE singleton limitation on Tizen
- **Subtitles via external SRT** — kino.pub API provides SRT URLs in `media-links` response; render with a custom overlay; handle Windows-1251 encoding for Cyrillic SRT files
- **localStorage for persistence** — auth tokens, settings, playback position
- **Focus-driven virtualization** — custom translateX-based rail rendering (render focusedIndex ± 5 cards), not react-window (designed for mouse/scroll, fights focus-driven TV navigation)
- **React.memo on all leaf components** — mandatory for TV CPU performance; all event handlers via useCallback

**Chromium M47 CSS constraints (banned features):**
- No CSS custom properties (`var(--*)`) — Chrome 49+
- No `gap` on flexbox — Chrome 84+
- No `aspect-ratio` — Chrome 88+
- No `:focus-visible` — Chrome 86+ (use `:focus` instead)
- No `clamp()` — Chrome 79+
- No `@container` queries
- Stick to flexbox (no CSS grid on M47)
- Use padding/margin for spacing, explicit width/height for aspect ratios

**API:** kino.pub v1 at `https://api.service-kp.com/v1/`
- OAuth2 device flow with `client_id: 'xbmc'`, `client_secret: 'cgg3gtifu46urtfp2zp1nqtba0k2ezxh'`
- Video URLs via `GET /v1/items/media-links?mid={mediaId}` → `files[].url.hls`
- Subtitles via same endpoint → `subtitles[].url`

**Estimated bundle size (~170KB gzipped):**
- react + react-dom: ~45KB
- hls.js light UMD: ~55KB
- zustand: ~1KB
- norigin-spatial-navigation: ~5KB
- core-js polyfills (chrome47): ~40KB
- CSS modules output: ~5KB
- app code: ~20KB

**Reference code:**
- [slonopot/msx-hlsx](https://github.com/slonopot/msx-hlsx) — hls.js audio track + subtitle selection on Samsung TVs
- [ValeraGin/kinopub.webos](https://github.com/ValeraGin/kinopub.webos) — TypeScript API types for kino.pub
- [james-mux/tizen-web-hlsjs](https://github.com/james-mux/tizen-web-hlsjs) — hls.js on Tizen proof-of-concept
- [aqualhume/kinopub-api](https://github.com/aqualhume/kinopub-api) — Unofficial API documentation
- [ctepeo/KinoPub](https://github.com/ctepeo/KinoPub) — Tizen config.xml template

## Files

### Project setup
- `package.json` — dependencies: react, react-dom, hls.js, zustand, @noriginmedia/norigin-spatial-navigation; devDeps: @vitejs/plugin-legacy, @vitejs/plugin-react, terser, core-js
- `vite.config.ts` — build target `chrome47`, hls.js alias to UMD light build, @vitejs/plugin-legacy with targets `chrome 47`
- `tsconfig.json` — strict mode, jsx: react-jsx, target: ES2015
- `.browserslistrc` — `chrome 47`
- `index.html` — shell HTML with `<div id="viewport">`

### Tizen widget
- `tizen/config.xml` — Tizen widget manifest with internet, tv.inputdevice, network.public privileges
- `scripts/build-wgt.sh` — script: `vite build` → copy config.xml + icon → zip as .wgt

### API client (`src/api/`)
- `src/api/client.ts` — fetch wrapper with auth header injection, token refresh with promise-based mutex, retry with backoff for network errors, typed response parsing
- `src/api/auth.ts` — OAuth2 device flow: getDeviceCode, pollForToken, refreshToken
- `src/api/content.ts` — types, genres, items listing, search, item detail, fresh/hot/popular
- `src/api/media.ts` — media-links (video URLs + subtitles)
- `src/api/bookmarks.ts` — folders CRUD, add/remove items
- `src/api/watching.ts` — watching status, marktime, toggle watched, continue watching
- `src/api/history.ts` — watch history

### Types (`src/types/`)
- `src/types/api.ts` — API response wrapper, pagination
- `src/types/content.ts` — Item, Season, Episode, Poster, Genre, Country
- `src/types/media.ts` — MediaFile, MediaUrl, Subtitle, MediaLinks
- `src/types/auth.ts` — DeviceCode, TokenResponse
- `src/types/bookmark.ts` — BookmarkFolder
- `src/types/watching.ts` — WatchingItem, WatchingStatus

### State (`src/store/`)
- `src/store/auth.ts` — zustand store: tokens, isAuthenticated, login/logout/refresh
- `src/store/player.ts` — zustand store: current media, playback state, selected tracks
- `src/store/ui.ts` — zustand store: current screen, navigation stack with lastFocusKey per entry, settings, capped at 20 entries

### Contexts (`src/contexts/`)
- `src/contexts/PlayerContext.tsx` — owns single `<video>` element ref + hls.js instance; provides loadSource, destroy, getAudioTracks, setAudioTrack, playback state; mounted at App level

### Pages (`src/pages/`)
- `src/pages/AuthPage.tsx` — device code display, polling, "go to kino.pub/device" instruction
- `src/pages/HomePage.tsx` — content rails (fresh, hot, popular, continue watching) with horizontal scroll
- `src/pages/ContentPage.tsx` — item detail: poster, metadata, play button, seasons/episodes, bookmarks
- `src/pages/PlayerPage.tsx` — thin overlay consuming PlayerContext, shows controls
- `src/pages/SearchPage.tsx` — text input + results grid
- `src/pages/BookmarksPage.tsx` — bookmark folders → items list
- `src/pages/HistoryPage.tsx` — watch history list
- `src/pages/SettingsPage.tsx` — CDN server toggle, about

### Components (`src/components/`)
- `src/components/Sidebar.tsx` — left icon sidebar (Home, Search, Bookmarks, History, Settings, Profile)
- `src/components/ContentRail.tsx` — focus-driven horizontal rail: translateX-based rendering, focusedIndex ± 5 cards visible, preferredChildFocusKey for rail focus memory
- `src/components/PosterCard.tsx` — React.memo wrapped; poster image with focus-driven lazy loading, title, year, rating
- `src/components/EpisodeList.tsx` — season selector + episode rows
- `src/components/Player/PlayerOverlay.tsx` — play/pause, seek bar, time display; auto-hides after 5s
- `src/components/Player/TrackPicker.tsx` — audio track + subtitle selection; uses FocusContext for focus containment
- `src/components/Player/SubtitleRenderer.tsx` — SRT subtitle display overlay with encoding detection
- `src/components/Player/ProgressBar.tsx` — seek bar with remote navigation
- `src/components/FocusableCard.tsx` — wrapper integrating norigin spatial nav with card components
- `src/components/ErrorBoundary.tsx` — catches React render errors, "Something went wrong" + Enter to retry
- `src/components/NetworkError.tsx` — API/network failure display with retry action
- `src/components/LoadingSkeleton.tsx` — shimmer placeholder cards for loading states
- `src/components/TransitionWrapper.tsx` — 150ms opacity fade for screen transitions

### Hooks (`src/hooks/`)
- `src/hooks/useRemoteKeys.ts` — Samsung remote key event handling with explicit key registration via tizen.tvinputdevice.registerKey()
- `src/hooks/usePlaybackSync.ts` — marktime sync every 30s during playback
- `src/hooks/useSubtitles.ts` — SRT fetch with Windows-1251/UTF-8 encoding detection, parse, sync to playback time, HTML tag sanitization

### Entry
- `src/index.tsx` — React root mount, spatial nav init, Samsung remote key registration, auth check → route to Auth or Home
- `src/App.tsx` — PlayerContext provider, screen router with TransitionWrapper, sidebar layout, ErrorBoundary, React.lazy + Suspense for page code splitting

### Styles (`src/styles/`)
- `src/styles/global.css` — dark theme base (#101c36), TV-friendly font sizes (24px base, 32px+ titles), overscan-safe margins (5%)
- `src/styles/variables.css` — NOT CSS custom properties; static color/spacing constants via CSS classes
- Each component: colocated `.module.css` file

## Tasks

### Task 1: Project scaffolding
- [x] Init repo at `/Users/ivkin/git/kinopub-tizen` with `git init`
- [x] `npm init -y` + install dependencies: `react react-dom hls.js zustand @noriginmedia/norigin-spatial-navigation`
- [x] Install dev dependencies: `typescript @types/react @types/react-dom vite @vitejs/plugin-react @vitejs/plugin-legacy terser core-js eslint`
- [x] Create `vite.config.ts`:
  - `build.target: 'chrome47'`
  - `resolve.alias: { 'hls.js': 'hls.js/dist/hls.light.js' }` (force UMD light build, avoids ESM lockups on Tizen)
  - `@vitejs/plugin-legacy({ targets: 'chrome 47' })` for core-js polyfills
  - `@vitejs/plugin-react()`
- [x] Create `.browserslistrc` with `chrome 47`
- [x] Create `tsconfig.json` with strict mode, jsx: react-jsx, target: ES2015, moduleResolution: bundler
- [x] Create `src/styles/global.css` — dark theme base styles, TV font sizes, overscan margins. No CSS custom properties, no gap, no aspect-ratio, no :focus-visible
- [x] Create `index.html` with `<div id="viewport">`, link to global.css, dark background
- [x] Create `src/index.tsx` with React root mount
- [x] Create `src/App.tsx` with placeholder "Hello KinoPub" text
- [x] Verify `npm run dev` starts and renders in browser
- [x] Create `tizen/config.xml` with privileges:
  - `http://tizen.org/privilege/internet`
  - `http://tizen.org/privilege/tv.inputdevice`
  - `http://developer.samsung.com/privilege/network.public`
  - `<access origin="*" subdomains="true"/>`
  - `<tizen:allow-navigation>*</tizen:allow-navigation>`
- [x] Create `scripts/build-wgt.sh` that builds + copies config.xml + zips as .wgt
- [x] **DoD:** `npm run dev` shows the app in browser, `npm run build` produces `dist/` with working HTML/JS, legacy polyfill bundle is generated

### Task 2: Tizen compatibility verification
- [x] Install Tizen Studio + Tizen 3.0 TV emulator (or use real 2017+ Samsung TV) (skipped - manual on-device task)
- [x] Deploy Task 1 output (.wgt) to emulator/TV (skipped - manual on-device task)
- [x] Verify: React renders without errors in Chromium M47 (skipped - manual on-device task)
- [x] Verify: CSS applies correctly (no broken styles from unsupported features) (skipped - manual on-device task)
- [x] Verify: hls.js light build loads without JS errors (test with `new Hls()` in console) (skipped - manual on-device task)
- [x] Verify: polyfills work (`Object.entries`, `Array.from` available) (skipped - manual on-device task)
- [x] Document any compatibility issues found and fix before proceeding (skipped - manual on-device task)
- [x] **DoD:** Bare scaffolding app renders correctly on Tizen 3.0 target (skipped - manual on-device task)

### Task 3: TypeScript types
- [ ] Create `src/types/api.ts` — ApiResponse<T>, PaginatedResponse<T>, Pagination
- [ ] Create `src/types/auth.ts` — DeviceCodeResponse, TokenResponse
- [ ] Create `src/types/content.ts` — Item, Season, Episode, Poster, Genre, Country, Duration, Trailer
- [ ] Create `src/types/media.ts` — MediaLinks, MediaFile, MediaUrl (http/hls/hls2/hls4), Subtitle
- [ ] Create `src/types/bookmark.ts` — BookmarkFolder
- [ ] Create `src/types/watching.ts` — WatchingItem, WatchingStatus, HistoryEntry
- [ ] **DoD:** `npx tsc --noEmit` passes with no errors

### Task 4: API client
- [ ] Create `src/api/client.ts`:
  - Fetch wrapper with base URL `https://api.service-kp.com/v1/`
  - Auth header injection from auth store
  - Promise-based refresh token mutex: if refresh in progress, queue concurrent 401 retries until refresh completes (prevents race condition where two 401s both refresh and invalidate each other's tokens)
  - Retry with exponential backoff for network errors (not 4xx)
  - Typed response parsing
  - Distinguish error types: 401 → re-auth, 403 → subscription error, network → NetworkError, 5xx → server error
- [ ] Create `src/api/auth.ts` — `getDeviceCode()`, `pollForToken(code)`, `refreshToken(refreshToken)` using OAuth2 device flow
- [ ] Create `src/api/content.ts` — `getTypes()`, `getGenres()`, `getItems(params)`, `searchItems(query)`, `getItemDetail(id)`, `getFresh()`, `getHot()`, `getPopular()`
- [ ] Create `src/api/media.ts` — `getMediaLinks(mid)` returning files with HLS URLs + subtitles
- [ ] Create `src/api/bookmarks.ts` — `getFolders()`, `getFolderItems(folderId)`, `addItem(itemId, folderId)`, `removeItem(itemId, folderId)`
- [ ] Create `src/api/watching.ts` — `getWatchingSerials()`, `getWatchingMovies()`, `markTime(itemId, videoId, time)`, `toggleWatched(itemId, videoId)`, `toggleWatchlist(itemId)`
- [ ] Create `src/api/history.ts` — `getHistory(page)`
- [ ] **DoD:** `npx tsc --noEmit` passes; manually test auth flow in browser console against live API

### Task 5: Zustand stores
- [ ] Create `src/store/auth.ts` — `accessToken`, `refreshToken`, `isAuthenticated`, `login(tokens)`, `logout()`, `refresh()`. Persist tokens to localStorage, hydrate on init
- [ ] Create `src/store/player.ts` — `mediaUrl`, `subtitles`, `audioTracks`, `selectedAudioTrack`, `selectedSubtitle`, `isPlaying`, `currentTime`, `duration`
- [ ] Create `src/store/ui.ts`:
  - `currentScreen` enum: auth/home/content/player/search/bookmarks/history/settings
  - `screenParams` (contentId, etc.)
  - `navigate(screen, params)` — pushes to navigation stack with `lastFocusKey: null`, caps stack at 20 entries
  - `goBack()` — pops stack, restores `lastFocusKey` from previous entry; when stack empty, calls `tizen.application.getCurrentApplication().exit()` (with try/catch for browser dev)
  - `setLastFocusKey(key)` — updates current stack entry's focus key for restoration on Back
  - Player navigation replaces stack entry (not push) to avoid Back cycling through player
  - Clear stack on logout
- [ ] **DoD:** `npx tsc --noEmit` passes

### Task 6: Error handling components
- [ ] Create `src/components/ErrorBoundary.tsx` — catches React render errors, shows "Something went wrong" with "Press Enter to retry" action, logs error
- [ ] Create `src/components/NetworkError.tsx` — displayed on API/network failures; shows message + "Press Enter to retry"; checks `navigator.onLine` for offline detection
- [ ] Create `src/components/LoadingSkeleton.tsx` — shimmer placeholder cards matching PosterCard dimensions; also a generic spinner variant
- [ ] Create `src/components/TransitionWrapper.tsx` — 150ms opacity fade on screen mount (CSS `transition: opacity 150ms`, not transform)
- [ ] **DoD:** Components render correctly, ErrorBoundary catches thrown errors in children

### Task 7: Auth page
- [ ] Create `src/pages/AuthPage.tsx` — displays user_code in large text (48px+), shows "Go to kino.pub/device", polls every 5s, redirects to Home on success
- [ ] Create `src/App.tsx`:
  - Wraps everything in `ErrorBoundary` and `PlayerContext.Provider`
  - Checks auth store on mount, routes to AuthPage if not authenticated
  - Uses `React.lazy` + `Suspense` for all page imports (code splitting)
  - `TransitionWrapper` around screen content
- [ ] Style with CSS modules: dark background (#101c36), centered white text
- [ ] **DoD:** App starts, shows auth screen, device code appears, can complete auth flow in browser

### Task 8: Sidebar + layout shell
- [ ] Create `src/components/Sidebar.tsx`:
  - Vertical icon sidebar matching KinoPub STV: Home, Search, Bookmarks, History, Settings, Profile icons
  - Own `FocusContext` from norigin (isolated focus tree)
  - Highlights active screen
  - Focusable items with `useFocusable()`
- [ ] Create layout in `src/App.tsx` — sidebar (fixed left, ~60px) + main content area, each in own `FocusContext`
- [ ] Wire sidebar items to `ui.navigate()` calls
- [ ] Global behavior: Left arrow at left edge of any content area → focus transfers to sidebar; Right arrow from sidebar → focus transfers to content area
- [ ] Register Samsung remote keys at app startup in `src/index.tsx`:
  - Guard with `if (window.tizen?.tvinputdevice)`
  - Register: MediaPlayPause, MediaPlay, MediaPause, MediaStop, MediaFastForward, MediaRewind, ColorF0Red, ColorF1Green, ColorF2Yellow, ColorF3Blue
- [ ] **DoD:** Sidebar renders, keyboard/arrow navigation works between sidebar and content, selecting navigates screens, remote keys registered on Tizen

### Task 9: Home page with content rails
- [ ] Create `src/components/PosterCard.tsx`:
  - Wrapped in `React.memo`
  - Poster image (250x375) with focus-driven lazy loading: placeholder by default, real `src` set when card enters render window
  - Explicit `width`/`height` attributes to prevent layout shift
  - Title, year below image
  - Focus ring (`:focus` outline, not `:focus-visible`) on highlight
  - Uses `useFocusable()` from norigin
- [ ] Create `src/components/ContentRail.tsx`:
  - Focus-driven horizontal virtualization: maintains `focusedIndex` state
  - Renders items from `max(0, focusedIndex - 5)` to `min(items.length - 1, focusedIndex + 5)`
  - Uses `transform: translateX(...)` to position rail (GPU-composited, not `scrollLeft`)
  - `preferredChildFocusKey` on FocusContext for rail focus memory (remembers last focused card when rail regains focus)
  - All `onSelect`/`onFocus` handlers via `useCallback`
- [ ] Create `src/components/FocusableCard.tsx` — generic focusable wrapper for spatial nav
- [ ] Create `src/pages/HomePage.tsx`:
  - Fetches fresh, hot, popular, continue watching
  - Shows `LoadingSkeleton` shimmer cards while loading
  - Renders as vertical stack of ContentRails
  - Vertical virtualization: render focused rail ± 1 (3 rails visible)
  - First rail auto-focuses on load
  - Saves `lastFocusKey` to ui store on navigate away
- [ ] **DoD:** Home page shows content from live API, arrow keys navigate between and within rails, posters lazy-load, focus restores on Back

### Task 10: Content detail page
- [ ] Create `src/pages/ContentPage.tsx`:
  - Fetches item detail by ID (`nolinks=1`)
  - Shows: wide poster background, title, year, rating, duration, plot, genres, cast
  - `LoadingSkeleton` while fetching
- [ ] For movies: Play button (focused by default)
- [ ] For series: `src/components/EpisodeList.tsx` — season tabs + episode rows (thumbnail, title, number, duration, watched indicator). Rows wrapped in `React.memo`
- [ ] Bookmark toggle button
- [ ] Enter on episode/play button → navigate to Player with mediaId
- [ ] **DoD:** Content page renders for both movies and series, episode list navigable, play triggers navigation

### Task 11: PlayerContext + hls.js player
- [ ] Create `src/contexts/PlayerContext.tsx`:
  - Owns single `<video>` element ref (mounted at App level, hidden when not playing, fullscreen when playing)
  - Owns hls.js instance (singleton)
  - Provides: `loadSource(url)`, `destroy()`, `getAudioTracks()`, `setAudioTrack(id)`, `currentTime`, `duration`, `isPlaying`, `play()`, `pause()`, `seek(time)`
  - hls.js error handling: listen for `Hls.Events.ERROR`, distinguish fatal vs non-fatal
  - Fatal network errors: show "Network error — retrying" state, call `hls.startLoad()` with exponential backoff (handles VPN drops)
  - Fatal media errors: call `hls.recoverMediaError()`, if still fails show retry overlay
  - hls.js config tuning for Tizen: set `skipBufferHolePadding` > GOP length
- [ ] Create `src/hooks/useRemoteKeys.ts`:
  - Listens for Samsung remote keys via `keydown` events
  - Key codes: play/pause (MediaPlayPause/415, Enter/13), back (10009/Backspace/8), arrows (37-40), channel up/down for seek ±30s
  - Guards Tizen-specific key codes with `typeof tizen !== 'undefined'`
- [ ] Create `src/hooks/usePlaybackSync.ts` — calls markTime API every 30s with current position from PlayerContext
- [ ] Create `src/pages/PlayerPage.tsx`:
  - Thin overlay consuming PlayerContext
  - Fetches media-links by mediaId on mount, picks highest quality `url.hls`
  - Calls `playerContext.loadSource(url)`
- [ ] Create `src/components/Player/PlayerOverlay.tsx`:
  - Shows on any key press, auto-hides after 5s
  - Displays: title, currentTime / duration, play/pause icon
  - Uses own `FocusContext` for focus containment (prevents focus escaping to sidebar)
- [ ] Create `src/components/Player/ProgressBar.tsx` — seek bar navigable with Left/Right arrows (±10s), shows buffered range
- [ ] Create `src/components/Player/TrackPicker.tsx`:
  - Overlay triggered by Up arrow from progress bar
  - Lists audio tracks from PlayerContext, subtitles from media-links response
  - Uses own `FocusContext` for focus containment
  - Selecting switches audio track via `playerContext.setAudioTrack(id)` or toggles subtitle
  - On close, returns focus to player controls
- [ ] **DoD:** Video plays via hls.js, overlay shows/hides, can seek, can switch audio track, VPN drop shows retry overlay, playback position syncs to API

### Task 12: Subtitles
- [ ] Create `src/hooks/useSubtitles.ts`:
  - Fetches SRT from API URL as `ArrayBuffer`
  - Encoding detection: try UTF-8 decode first, if garbled (detect via BOM or heuristic), fallback to `TextDecoder('windows-1251')` for Cyrillic SRT files
  - Parses SRT format into cue array `[{start, end, text}]`
  - Strips or sanitizes HTML tags (`<i>`, `<b>`, `<font>`) in SRT text — no raw innerHTML
  - Syncs current cue to video currentTime from PlayerContext
- [ ] Create `src/components/Player/SubtitleRenderer.tsx` — positioned overlay at bottom of video, renders current cue text, styled white text with dark text-shadow
- [ ] Integrate with TrackPicker — selecting a subtitle triggers SRT fetch + enables renderer
- [ ] "Off" option in subtitle picker disables renderer
- [ ] **DoD:** External SRT subtitles display in sync with video, Cyrillic renders correctly, can switch between subtitle tracks or turn off

### Task 13: Search page
- [ ] Create `src/pages/SearchPage.tsx` — text input at top (Samsung on-screen keyboard opens on focus), results grid below
- [ ] Debounce search input by 500ms, call `searchItems(query)`
- [ ] Results as grid of PosterCards (memoized), navigable with spatial nav
- [ ] `LoadingSkeleton` while searching
- [ ] Enter on card → navigate to ContentPage
- [ ] **DoD:** Can type search query, results appear, can navigate to content

### Task 14: Bookmarks + History pages
- [ ] Create `src/pages/BookmarksPage.tsx` — list bookmark folders, enter folder shows items as PosterCard grid, `LoadingSkeleton` while loading
- [ ] Create `src/pages/HistoryPage.tsx` — paginated history list with poster, title, progress indicator, `LoadingSkeleton` while loading
- [ ] **DoD:** Both pages load data from API and render navigable lists

### Task 15: Settings page
- [ ] Create `src/pages/SettingsPage.tsx` — CDN server selection (Auto/Netherlands/Russia), stored in localStorage
- [ ] Show clock toggle
- [ ] About section with app version
- [ ] Logout button (clears auth store + localStorage, resets nav stack)
- [ ] **DoD:** Settings persist across app restarts, logout works

### Task 16: Tizen packaging + deploy
- [ ] Finalize `scripts/build-wgt.sh` — runs `npm run build`, copies `tizen/config.xml` + icon into `dist/`, zips `dist/` as `kinopub-tizen.wgt`
- [ ] Create `scripts/deploy-tv.sh` — automates sideloading: connects to TV via sdb, installs .wgt, launches app. Takes TV IP as argument
- [ ] Test sideloading .wgt onto Samsung TV via Tizen Studio
- [ ] Verify on TV: auth flow, browsing, video playback with hls.js, audio track switching, subtitles, remote navigation, focus restoration on Back, error overlays
- [ ] Verify Back button on empty stack exits app
- [ ] **DoD:** App installed on Samsung TV, full user flow works end-to-end

### Task 17: E2E smoke tests (automated)
- [ ] Create `e2e/` directory with Playwright-based tests targeting the Vite dev server (browser mode, not TV — for CI)
- [ ] Create `e2e/playwright.config.ts` — Chromium only, viewport 1920x1080, base URL http://localhost:5173
- [ ] Create `e2e/auth.spec.ts`:
  - [ ] App loads without JS errors
  - [ ] Auth page renders with device code text and "kino.pub/device" link
  - [ ] Polling indicator is visible
- [ ] Create `e2e/navigation.spec.ts`:
  - [ ] Sidebar renders with all expected icons (Home, Search, Bookmarks, History, Settings, Profile)
  - [ ] Arrow key navigation moves focus between sidebar items (simulate keydown ArrowUp/ArrowDown)
  - [ ] Enter on sidebar item changes the main content area
  - [ ] Back key (Backspace) returns to previous screen
  - [ ] Back on empty stack does not crash (exits gracefully or stays on home)
- [ ] Create `e2e/home.spec.ts` (requires auth mock or test token):
  - [ ] Home page renders content rails with poster cards
  - [ ] Arrow keys navigate horizontally within a rail
  - [ ] Arrow Down moves focus to next rail
  - [ ] Poster card shows title and image (or placeholder)
  - [ ] Enter on card navigates to content detail page
- [ ] Create `e2e/content.spec.ts` (requires auth mock):
  - [ ] Content page renders title, poster, plot, metadata
  - [ ] Play button is focusable
  - [ ] For series: season tabs render, episode list renders
  - [ ] Enter on play button navigates to player screen
- [ ] Create `e2e/player.spec.ts` (requires auth mock + media-links mock):
  - [ ] Player page mounts video element
  - [ ] hls.js initializes without errors (check console for Hls.Events.ERROR)
  - [ ] Player overlay appears on keypress and auto-hides after 5s
  - [ ] Track picker opens on expected key and lists audio tracks
  - [ ] Back key exits player and returns to content page
- [ ] Create `e2e/search.spec.ts` (requires auth mock):
  - [ ] Search page renders input field
  - [ ] Typing triggers debounced search (mock API returns results)
  - [ ] Results grid renders poster cards
  - [ ] Enter on result navigates to content page
- [ ] Create `e2e/fixtures/` with mock API responses:
  - [ ] `auth-token.json` — pre-authenticated token for bypassing auth flow in tests
  - [ ] `items-fresh.json`, `items-hot.json` — mock content rail data
  - [ ] `item-detail-movie.json`, `item-detail-serial.json` — mock item details
  - [ ] `media-links.json` — mock video URLs + subtitles (use a public HLS test stream URL)
  - [ ] `search-results.json` — mock search response
  - [ ] `bookmarks.json`, `history.json` — mock bookmark/history data
- [ ] Create `e2e/helpers/mock-api.ts` — Playwright route handler that intercepts `api.service-kp.com` requests and returns fixture data
- [ ] Add `npm run e2e` script: starts Vite dev server + runs Playwright tests
- [ ] Add `npm run e2e:headed` for debugging with visible browser
- [ ] **DoD:** All E2E tests pass in headless Chromium, no console errors, full navigation flow verified

### Task 18: E2E on-device verification (manual + scripted)

This task verifies the app works on an actual Samsung TV after deployment.

- [ ] Create `e2e/tv-checklist.md` — structured manual test script with pass/fail checkboxes:
  - [ ] **Install:** `scripts/deploy-tv.sh <TV_IP>` succeeds, app appears in TV app list
  - [ ] **Launch:** App opens without white screen or JS errors (check Tizen Web Inspector console)
  - [ ] **Auth:** Device code appears, entering code at kino.pub/device activates the app, home screen loads
  - [ ] **Home rails:** At least 3 content rails load with poster images, no blank cards
  - [ ] **Navigation:** D-pad Up/Down moves between rails, Left/Right within rail, focus ring visible from 3 meters
  - [ ] **Focus restoration:** Navigate Home → Content → Back, verify focus returns to the same poster card
  - [ ] **Content detail:** Select any item, verify title/plot/poster render. For series: season tabs + episodes visible
  - [ ] **Playback (VPN on):** Press play, video starts within 5 seconds, no "prepare error"
  - [ ] **Audio tracks:** Open track picker during playback, switch audio language, audio changes
  - [ ] **Subtitles:** Enable subtitles, Cyrillic text renders correctly at bottom of screen
  - [ ] **Seek:** Left/Right arrows seek ±10s, progress bar updates
  - [ ] **Playback sync:** After watching 2+ minutes, exit and re-enter — playback resumes near last position
  - [ ] **Search:** Navigate to search, type query via on-screen keyboard, results appear
  - [ ] **Bookmarks:** Add item to bookmarks, navigate to Bookmarks page, item appears
  - [ ] **History:** Navigate to History page, recently watched items appear
  - [ ] **Settings:** Change CDN server, verify setting persists after app restart
  - [ ] **Logout:** Logout, verify auth screen appears, tokens cleared
  - [ ] **VPN drop:** During playback, disconnect VPN (disable WireGuard on GL.iNet). Verify retry overlay appears. Re-enable VPN, verify playback resumes
  - [ ] **No VPN:** With VPN off, attempt playback. Verify NetworkError component shows (not a blank screen or crash)
  - [ ] **Long playback:** Play a 30+ minute video, verify no memory issues or freezes
  - [ ] **App restart:** Close and reopen app, verify tokens persist, no re-auth needed
  - [ ] **Back exit:** From home screen, press Back — app exits cleanly (no hang)
- [ ] Create `scripts/tv-console-check.sh` — connects to TV via sdb, tails the app's console log, greps for errors/warnings. Used during manual testing to monitor JS errors in real time
- [ ] Run full checklist on Samsung TV through GL.iNet VPN
- [ ] Document any failures, fix, and re-test
- [ ] **DoD:** All checklist items pass on a real Samsung TV with VPN active

### Task 19: Final validation
- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npm run lint` — no lint errors
- [ ] `npm run test` — all unit tests pass
- [ ] `npm run e2e` — all Playwright E2E tests pass in headless Chromium
- [ ] `npm run build` — builds successfully, verify legacy polyfill bundle is generated
- [ ] Check bundle size: total gzipped < 300KB (budget is generous at ~170KB estimated)
- [ ] Task 18 on-device checklist fully passed
- [ ] Test on oldest available Samsung TV (ideally 2017 model) for Chromium M47 compat
