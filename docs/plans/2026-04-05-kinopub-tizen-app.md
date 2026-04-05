# KinoPub Tizen — Standalone Samsung TV Streaming App

## Context

The KinoPub STV app (kpstv.net) fails to play video on Samsung TVs through VPN — Samsung's AVPlay API chokes on HLS4 streams with "prepare error". The app is closed-source (Svelte 3, no repo) with no way to change the stream protocol. A workaround using kp-msx proxy + Media Station X proves that using hls.js (JavaScript-based HLS player via MSE) instead of AVPlay fixes playback completely.

This project builds a standalone Tizen web app that talks directly to the kino.pub API and uses hls.js for playback — eliminating the need for any proxy server. The app clones KinoPub STV's UX: dark theme, left sidebar navigation, content rails, full-featured player with audio track and subtitle switching.

The GL.iNet VPN router is still required for video CDN geo-restriction bypass, but no Mac/proxy dependency.

## Approach

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + hls.js + @noriginmedia/norigin-spatial-navigation

**Key decisions:**
- **React over Svelte** — developer familiarity, strong spatial navigation library ecosystem
- **hls.js over AVPlay** — AVPlay fails with HLS4 through VPN; hls.js uses MSE which works on Tizen 2015+
- **Use `url.hls` not `url.hls4`** — simpler HLS streams that hls.js handles reliably; HLS4 includes adaptive multi-track manifests that caused the original issue
- **Zustand over Redux** — ~1KB, minimal boilerplate, sufficient for this app's state complexity
- **No router library** — state-based screen switching (like KinoPub STV does), simpler for TV navigation
- **Vite target ES2015** — oldest Tizen Chromium is M47 (2017 TVs)
- **Single `<video>` element** — MSE singleton limitation on Tizen
- **Subtitles via external SRT** — kino.pub API provides SRT URLs in `media-links` response; render with a custom overlay
- **localStorage for persistence** — auth tokens, settings, playback position

**API:** kino.pub v1 at `https://api.service-kp.com/v1/`
- OAuth2 device flow with `client_id: 'xbmc'`, `client_secret: 'cgg3gtifu46urtfp2zp1nqtba0k2ezxh'`
- Video URLs via `GET /v1/items/media-links?mid={mediaId}` → `files[].url.hls`
- Subtitles via same endpoint → `subtitles[].url`

**Reference code:**
- [slonopot/msx-hlsx](https://github.com/slonopot/msx-hlsx) — hls.js audio track + subtitle selection on Samsung TVs
- [ValeraGin/kinopub.webos](https://github.com/ValeraGin/kinopub.webos) — TypeScript API types for kino.pub
- [james-mux/tizen-web-hlsjs](https://github.com/james-mux/tizen-web-hlsjs) — hls.js on Tizen proof-of-concept
- [aqualhume/kinopub-api](https://github.com/aqualhume/kinopub-api) — Unofficial API documentation
- [ctepeo/KinoPub](https://github.com/ctepeo/KinoPub) — Tizen config.xml template

## Files

### Project setup
- `package.json` — dependencies: react, react-dom, hls.js, zustand, @noriginmedia/norigin-spatial-navigation, tailwindcss
- `vite.config.ts` — build config targeting ES2015, output to `dist/`
- `tsconfig.json` — strict mode, ES2015 target
- `tailwind.config.ts` — dark theme, TV-friendly spacing/font scale
- `postcss.config.js` — tailwind + autoprefixer
- `index.html` — shell HTML with `<div id="viewport">`

### Tizen widget
- `tizen/config.xml` — Tizen widget manifest with internet privileges
- `scripts/build-wgt.sh` — script: `vite build` → copy config.xml → zip as .wgt

### API client (`src/api/`)
- `src/api/client.ts` — fetch wrapper with auth header injection, token refresh, error handling
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
- `src/store/ui.ts` — zustand store: current screen, navigation stack, settings

### Pages (`src/pages/`)
- `src/pages/AuthPage.tsx` — device code display, polling, "go to kino.pub/device" instruction
- `src/pages/HomePage.tsx` — content rails (fresh, hot, popular, continue watching) with horizontal scroll
- `src/pages/ContentPage.tsx` — item detail: poster, metadata, play button, seasons/episodes, bookmarks
- `src/pages/PlayerPage.tsx` — fullscreen hls.js player with overlay controls
- `src/pages/SearchPage.tsx` — text input + results grid
- `src/pages/BookmarksPage.tsx` — bookmark folders → items list
- `src/pages/HistoryPage.tsx` — watch history list
- `src/pages/SettingsPage.tsx` — CDN server toggle, about

### Components (`src/components/`)
- `src/components/Sidebar.tsx` — left icon sidebar (Home, Search, Bookmarks, History, Settings, Profile)
- `src/components/ContentRail.tsx` — horizontal scrollable row of poster cards with focus management
- `src/components/PosterCard.tsx` — content card with poster image, title, year, rating
- `src/components/EpisodeList.tsx` — season selector + episode rows
- `src/components/Player/PlayerOverlay.tsx` — play/pause, seek bar, time display
- `src/components/Player/TrackPicker.tsx` — audio track and subtitle selection overlay
- `src/components/Player/SubtitleRenderer.tsx` — SRT subtitle display overlay
- `src/components/Player/ProgressBar.tsx` — seek bar with remote navigation
- `src/components/FocusableCard.tsx` — wrapper integrating norigin spatial nav with card components
- `src/components/VirtualList.tsx` — virtualized list for large content grids (mandatory for TV perf)

### Hooks (`src/hooks/`)
- `src/hooks/useHlsPlayer.ts` — hls.js lifecycle: load source, attach to video, cleanup, track switching
- `src/hooks/useRemoteKeys.ts` — Samsung remote key event handling (play/pause, back, arrows, enter)
- `src/hooks/usePlaybackSync.ts` — marktime sync every 30s during playback
- `src/hooks/useSubtitles.ts` — SRT fetch, parse, sync to playback time

### Entry
- `src/index.tsx` — React root mount, spatial nav init, auth check → route to Auth or Home
- `src/App.tsx` — screen router based on ui store state, sidebar layout

## Tasks

### Task 1: Project scaffolding
- [ ] Create repo at `/Users/ivkin/git/kinopub-tizen`
- [ ] `npm init` + install dependencies: react, react-dom, typescript, vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer, zustand, hls.js, @noriginmedia/norigin-spatial-navigation
- [ ] Install dev dependencies: @types/react, @types/react-dom
- [ ] Create `vite.config.ts` with target ES2015, output to `dist/`
- [ ] Create `tsconfig.json` with strict mode, jsx: react-jsx, target: ES2015
- [ ] Create `tailwind.config.ts` with dark theme defaults, TV-friendly font sizes (base 24px)
- [ ] Create `postcss.config.js`
- [ ] Create `index.html` with `<div id="viewport">`, dark background
- [ ] Create `src/index.tsx` with React root mount
- [ ] Create `src/App.tsx` with placeholder "Hello KinoPub" text
- [ ] Verify `npm run dev` starts and renders in browser
- [ ] Create `tizen/config.xml` with internet + inputdevice privileges
- [ ] Create `scripts/build-wgt.sh` that builds + zips into .wgt
- [ ] **DoD:** `npm run dev` shows the app in browser, `npm run build` produces `dist/` with working HTML/JS

### Task 2: TypeScript types
- [ ] Create `src/types/api.ts` — ApiResponse<T>, PaginatedResponse<T>, Pagination
- [ ] Create `src/types/auth.ts` — DeviceCodeResponse, TokenResponse
- [ ] Create `src/types/content.ts` — Item, Season, Episode, Poster, Genre, Country, Duration, Trailer
- [ ] Create `src/types/media.ts` — MediaLinks, MediaFile, MediaUrl (http/hls/hls2/hls4), Subtitle
- [ ] Create `src/types/bookmark.ts` — BookmarkFolder
- [ ] Create `src/types/watching.ts` — WatchingItem, WatchingStatus, HistoryEntry
- [ ] **DoD:** `npx tsc --noEmit` passes with no errors

### Task 3: API client
- [ ] Create `src/api/client.ts` — fetch wrapper: base URL, auth header from store, automatic token refresh on 401, typed response parsing
- [ ] Create `src/api/auth.ts` — `getDeviceCode()`, `pollForToken(code)`, `refreshToken(refreshToken)` using OAuth2 device flow
- [ ] Create `src/api/content.ts` — `getTypes()`, `getGenres()`, `getItems(params)`, `searchItems(query)`, `getItemDetail(id)`, `getFresh()`, `getHot()`, `getPopular()`
- [ ] Create `src/api/media.ts` — `getMediaLinks(mid)` returning files with HLS URLs + subtitles
- [ ] Create `src/api/bookmarks.ts` — `getFolders()`, `getFolderItems(folderId)`, `addItem(itemId, folderId)`, `removeItem(itemId, folderId)`
- [ ] Create `src/api/watching.ts` — `getWatchingSerials()`, `getWatchingMovies()`, `markTime(itemId, videoId, time)`, `toggleWatched(itemId, videoId)`, `toggleWatchlist(itemId)`
- [ ] Create `src/api/history.ts` — `getHistory(page)`
- [ ] **DoD:** `npx tsc --noEmit` passes; manually test auth flow in browser console against live API

### Task 4: Zustand stores
- [ ] Create `src/store/auth.ts` — `accessToken`, `refreshToken`, `isAuthenticated`, `login(tokens)`, `logout()`, `refresh()`. Persist tokens to localStorage, hydrate on init
- [ ] Create `src/store/player.ts` — `mediaUrl`, `subtitles`, `audioTracks`, `selectedAudioTrack`, `selectedSubtitle`, `isPlaying`, `currentTime`, `duration`
- [ ] Create `src/store/ui.ts` — `currentScreen` (enum: auth/home/content/player/search/bookmarks/history/settings), `screenParams` (contentId, etc.), `navigate(screen, params)`, `goBack()`, navigation stack for back button
- [ ] **DoD:** `npx tsc --noEmit` passes

### Task 5: Auth page
- [ ] Create `src/pages/AuthPage.tsx` — displays user_code in large text, shows "Go to kino.pub/device", polls every 5s, redirects to Home on success
- [ ] Create `src/App.tsx` — checks auth store on mount, routes to AuthPage if not authenticated, HomePage if authenticated
- [ ] Style with Tailwind: dark background (#101c36 matching KinoPub STV), centered white text, KinoPub logo/icon
- [ ] **DoD:** App starts, shows auth screen, device code appears, can complete auth flow in browser

### Task 6: Sidebar + layout shell
- [ ] Create `src/components/Sidebar.tsx` — vertical icon sidebar matching KinoPub STV: Home, Search, Bookmarks, History, Settings, Profile icons. Highlights active screen. Focusable with spatial nav
- [ ] Create layout in `src/App.tsx` — sidebar (fixed left, ~60px) + main content area
- [ ] Wire sidebar items to `ui.navigate()` calls
- [ ] Handle Left arrow to focus sidebar from content, Right arrow to return to content
- [ ] **DoD:** Sidebar renders, keyboard/arrow navigation works between sidebar items, selecting navigates screens

### Task 7: Home page with content rails
- [ ] Create `src/components/PosterCard.tsx` — poster image (250x375), title, year. Focus ring on highlight. Uses `useFocusable()` from norigin
- [ ] Create `src/components/ContentRail.tsx` — horizontal scroll row: title label + row of PosterCards. Arrow keys scroll horizontally. Virtualize if >20 items
- [ ] Create `src/components/FocusableCard.tsx` — generic focusable wrapper for spatial nav integration
- [ ] Create `src/pages/HomePage.tsx` — fetches fresh, hot, popular, continue watching. Renders as vertical stack of ContentRails. First rail auto-focuses on load
- [ ] Implement virtualization for rails — only render visible cards ± 2 offscreen
- [ ] **DoD:** Home page shows content from live API, arrow keys navigate between and within rails, posters load

### Task 8: Content detail page
- [ ] Create `src/pages/ContentPage.tsx` — fetches item detail by ID. Shows: wide poster background, title, year, rating, duration, plot, genres, cast
- [ ] For movies: Play button (focused by default)
- [ ] For series: `src/components/EpisodeList.tsx` — season tabs + episode rows (thumbnail, title, number, duration, watched indicator)
- [ ] Bookmark toggle button
- [ ] Enter on episode/play button → navigate to Player with mediaId
- [ ] **DoD:** Content page renders for both movies and series, episode list navigable, play triggers navigation

### Task 9: hls.js player
- [ ] Create `src/hooks/useHlsPlayer.ts` — initializes hls.js, loads HLS URL, attaches to `<video>`, handles errors, exposes audio tracks list, destroys on unmount
- [ ] Create `src/hooks/useRemoteKeys.ts` — listens for Samsung remote keys: play/pause (MediaPlayPause/Enter), back (10009/Backspace), arrows, channel up/down for seek ±30s
- [ ] Create `src/hooks/usePlaybackSync.ts` — calls markTime API every 30s with current position
- [ ] Create `src/pages/PlayerPage.tsx` — fullscreen `<video>` element, fetches media-links by mediaId, picks highest quality `url.hls`, initializes hls.js
- [ ] Create `src/components/Player/PlayerOverlay.tsx` — shows on any key press, auto-hides after 5s. Displays: title, time / duration, play/pause icon
- [ ] Create `src/components/Player/ProgressBar.tsx` — seek bar navigable with Left/Right arrows (±10s), shows buffered range
- [ ] Create `src/components/Player/TrackPicker.tsx` — overlay triggered by remote button (e.g. Up arrow from progress bar). Lists audio tracks from hls.js `audioTrackController`, subtitles from API response. Selecting switches `hls.audioTrack` or toggles subtitle
- [ ] **DoD:** Video plays via hls.js, overlay shows/hides, can seek, can switch audio track, playback position syncs to API

### Task 10: Subtitles
- [ ] Create `src/hooks/useSubtitles.ts` — fetches SRT from API URL, parses SRT format into cue array [{start, end, text}], syncs current cue to video currentTime
- [ ] Create `src/components/Player/SubtitleRenderer.tsx` — positioned overlay at bottom of video, renders current cue text, styled white text with dark shadow
- [ ] Integrate with TrackPicker — selecting a subtitle triggers SRT fetch + enables renderer
- [ ] "Off" option in subtitle picker disables renderer
- [ ] **DoD:** External SRT subtitles display in sync with video, can switch between subtitle tracks or turn off

### Task 11: Search page
- [ ] Create `src/pages/SearchPage.tsx` — text input at top (Samsung on-screen keyboard opens on focus), results grid below
- [ ] Debounce search input by 500ms, call `searchItems(query)`
- [ ] Results as grid of PosterCards, navigable with spatial nav
- [ ] Enter on card → navigate to ContentPage
- [ ] **DoD:** Can type search query, results appear, can navigate to content

### Task 12: Bookmarks + History pages
- [ ] Create `src/pages/BookmarksPage.tsx` — list bookmark folders, enter folder shows items as PosterCard grid
- [ ] Create `src/pages/HistoryPage.tsx` — paginated history list with poster, title, progress indicator
- [ ] **DoD:** Both pages load data from API and render navigable lists

### Task 13: Settings page
- [ ] Create `src/pages/SettingsPage.tsx` — CDN server selection (Auto/Netherlands/Russia), stored in localStorage
- [ ] Show clock toggle
- [ ] About section with app version
- [ ] Logout button (clears auth store + localStorage)
- [ ] **DoD:** Settings persist across app restarts, logout works

### Task 14: Tizen packaging + deploy
- [ ] Create `scripts/build-wgt.sh` — runs `npm run build`, copies `tizen/config.xml` + icon into `dist/`, zips `dist/` as `kinopub-tizen.wgt`
- [ ] Test sideloading .wgt onto Samsung TV via Tizen Studio
- [ ] Verify: auth flow works on TV, browsing works, video plays with hls.js, audio track switching works, subtitles work, remote navigation works
- [ ] **DoD:** App installed on Samsung TV, full user flow works end-to-end

### Task 15: Full validation
- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npm run lint` — no lint errors
- [ ] `npm run build` — builds successfully, bundle size < 500KB gzipped
- [ ] Manual TV test: auth → browse → play movie → switch audio → enable subtitles → seek → back → search → bookmarks → history → settings → logout
- [ ] Test on VPN: video plays through GL.iNet VPN tunnel
- [ ] Test without VPN: verify app shows error gracefully when CDN is unreachable
