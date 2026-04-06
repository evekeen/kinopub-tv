# CLAUDE.md

## Project Overview

Standalone Samsung Tizen web app (.wgt) for streaming video from kino.pub. Uses hls.js (MSE-based JavaScript player) instead of Samsung's AVPlay to fix HLS4 playback issues through VPN. Clones KinoPub STV's UX.

## Tech Stack

- React 18 + TypeScript + Vite
- CSS Modules (no Tailwind — CSS custom properties break on Chromium M47)
- Zustand for state management
- hls.js light UMD build for video playback
- @noriginmedia/norigin-spatial-navigation for TV remote D-pad navigation
- @vitejs/plugin-legacy with core-js for Chromium M47 polyfills
- Target: Samsung Tizen 3.0+ (2017-2022 TVs, Chromium M47-M85)

## Common Commands

```bash
npm run dev          # Vite dev server (browser development)
npm run build        # Production build to dist/
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run storybook    # Storybook dev server on port 6006
npm run build-wgt    # Build + package as kinopub-tizen.wgt for Tizen sideloading
```

### Before committing, always run:
```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Project Structure

```
src/
├── api/           # kino.pub REST API client (auth, content, media, bookmarks, watching)
├── components/    # React components (Sidebar, PosterCard, ContentRail, Player/*)
├── contexts/      # PlayerContext (singleton video element + hls.js)
├── hooks/         # Custom hooks (useRemoteKeys, usePlaybackSync, useSubtitles)
├── pages/         # Screen-level components (Home, Content, Player, Search, Auth, etc.)
├── store/         # Zustand stores (auth, player, ui)
├── types/         # TypeScript interfaces for API responses
├── styles/        # global.css + colocated .module.css per component
└── index.tsx      # Entry point
tizen/
└── config.xml     # Tizen widget manifest
stories/           # Storybook stories
```

## Design Principles

- **KISS** — simplest solution that works on constrained TV hardware
- **DRY** — extract shared logic into hooks/utils when used 3+ times
- **SOLID** — single responsibility per component/hook, depend on interfaces not implementations
- **Fail fast** — crash loud on missing config, API errors surface immediately, no silent fallbacks
- **Performance first** — every decision must consider 2017 Samsung TV with Chromium M47 and ARM Cortex-A53 CPU

## Code Style

- No comments unless absolutely necessary for extreme tricky hacks
- Do not remove preexisting comments when editing code
- Self-documenting code through clear names
- Never inline types — create interfaces in `src/types/` and import them
- Never inline imports

### TypeScript

- No `any` — always use proper types
- No `as` casts — use type guards, `instanceof`, or discriminated unions
- Return types on all exported functions
- Exhaustive switch checks with `never` in default case:
```typescript
default: {
  const _exhaustive: never = status;
  throw new Error(`Unhandled: ${_exhaustive}`);
}
```

### React

- **`React.memo` on every leaf component** — mandatory for TV performance; a ContentRail with 20 cards re-rendering on focus change causes visible jank on TV CPUs
- **`useCallback` for all event handlers passed as props** — defeats React.memo without it
- **`useMemo` for computed arrays/objects** used as dependencies — React compares by reference, not value
- **Never use inline objects/arrays as props** — `<Card style={{ width: 250 }} />` creates new object every render, defeating memo
- **`React.lazy` + `Suspense`** for page-level code splitting — reduces initial parse time
- **No inline anonymous functions in JSX** — extract to named handlers
- Keep component trees shallow — deep nesting amplifies re-render cost on TV

### CSS Modules

- One `.module.css` file colocated with each component
- Global styles in `src/styles/global.css`
- Use camelCase for CSS class names (e.g., `.contentRail`, `.posterCard`)
- Never use `!important` — fix specificity properly

### Chromium M47 CSS Constraints (MUST follow)

These CSS features do NOT work on 2017 Samsung TVs and must never be used:

- **No CSS custom properties** (`var(--*)`) — Chrome 49+
- **No `gap` on flexbox** — Chrome 84+ (use margins instead)
- **No `aspect-ratio`** — Chrome 88+ (use padding-top hack or explicit width/height)
- **No `:focus-visible`** — Chrome 86+ (use `:focus` instead)
- **No `clamp()`** — Chrome 79+ (use fixed sizes)
- **No `@container` queries**
- **No CSS Grid** — unreliable on M47 (use flexbox)
- **No `backdrop-filter`** — expensive compositing, inconsistent support

### CSS Performance for TV

- Only animate `transform` and `opacity` — everything else triggers Layout or Paint
- Never animate `top`, `left`, `width`, `height`, `margin`, `padding`, `box-shadow`
- Use `transform: translateX(...)` for scrolling rails (GPU-composited), not `scrollLeft` (triggers layout)
- Minimize `box-shadow` and `border-radius` — expensive repaint on TV GPUs
- Use `translateZ(0)` sparingly to promote to GPU layer — too many layers waste GPU memory
- Keep CSS selectors flat — no deep nesting

## Tizen-Specific Rules

### Remote Key Registration

Samsung TVs require explicit key registration before media keys can be captured:
```typescript
if (window.tizen?.tvinputdevice) {
  const keys = ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
    'MediaFastForward', 'MediaRewind', 'ColorF0Red', 'ColorF1Green',
    'ColorF2Yellow', 'ColorF3Blue'];
  keys.forEach(k => tizen.tvinputdevice.registerKey(k));
}
```
**Never register VolumeUp/VolumeDown/VolumeMute** — preserve native TV volume control.

### App Lifecycle

- Back button with empty navigation stack must call `tizen.application.getCurrentApplication().exit()` (with try/catch for browser dev)
- Handle `visibilitychange` event for suspend/restore — re-validate auth tokens on resume
- Guard all Tizen API calls with `if (window.tizen)` for browser development

### config.xml Privileges

```xml
<tizen:privilege name="http://tizen.org/privilege/internet"/>
<tizen:privilege name="http://tizen.org/privilege/tv.inputdevice"/>
<tizen:privilege name="http://developer.samsung.com/privilege/network.public"/>
<access origin="*" subdomains="true"/>
<tizen:allow-navigation>*</tizen:allow-navigation>
```

### Inline Scripts Forbidden

Tizen CSP blocks inline scripts. All JS must be in external `.js` files loaded via `<script src="...">`.

## Performance Rules for TV

### DOM
- Keep total DOM node count in the hundreds, never thousands
- Virtual/windowed rendering for all lists and rails
- Store DOM element references in variables — never repeatedly query the DOM
- Batch DOM reads and writes separately to avoid layout thrashing

### Memory
- Entry-level TVs: ~1.5 GB RAM shared with OS; JS heap ~25 MB
- Proactively release video element resources when not playing
- Extended playback (2+ hours) can cause memory growth — monitor and release
- localStorage limited to ~2.5-5 MB per origin

### Images
- Serve exact resolution needed (250x375 for posters, not larger)
- Set explicit `width` and `height` on all `<img>` to prevent layout shift
- Focus-driven lazy loading: only load images for cards within the render window
- Use solid color placeholder while images load

### JavaScript
- Remove all `console.log` in production — it blocks the JS thread
- Use `Promise.all()` for parallel async operations
- Keep animation frame callbacks under 16ms (30fps target on TV CPUs)
- Debounce rapid remote key events to prevent flooding

## hls.js Integration

### Critical: Use UMD Full Build (not ESM, not light)

The ESM build causes multi-second lockups on Tizen (hls.js#7106). The light build (`hls.light.js`) excludes the audio track controller — alternate audio renditions are invisible. Always alias to the full UMD build:
```typescript
resolve: {
  alias: { 'hls.js': 'hls.js/dist/hls.js' }
}
```

### Use `url.hls4` for Multi-Audio Support

- `url.hls` = single muxed audio stream (e.g., `master-v1a1.m3u8`) — no audio track switching
- `url.hls4` = HLS4 manifest with `#EXT-X-MEDIA:TYPE=AUDIO` alternate renditions — all audio tracks available for switching via hls.js
- Prefer `url.hls4` with fallback to `url.hls`: `bestFile.url.hls4 ?? bestFile.url.hls`
- The original AVPlay HLS4 issue does NOT affect hls.js — it was Samsung's AVPlay that choked on HLS4

### PlayerContext Singleton

The `<video>` element and hls.js instance live in a React Context at the App level. This avoids MSE SourceBuffer detach/reattach race conditions when navigating in/out of the player page.

### Error Recovery

- Listen for `Hls.Events.ERROR`, distinguish fatal vs non-fatal
- Fatal network errors (VPN drops): show retry overlay, call `hls.startLoad()` with exponential backoff
- Fatal media errors: call `hls.recoverMediaError()`, then retry
- Non-fatal errors: log and ignore

## kino.pub API Quirks (Learned from Production)

### OAuth2 Device Flow
- Get device code: POST `/oauth2/device` with `grant_type=device_code` → returns `{code, user_code, verification_uri, interval, expires_in}`
- Poll for token: POST `/oauth2/device` with `grant_type=device_token` and `code=<code>` (NOT `device_code` — that creates a new code)
- While pending: API returns a new device code response (not an `{error: "authorization_pending"}`) — treat any device code response during polling as "still waiting"
- Refresh token: POST `/oauth2/token` with `grant_type=refresh_token`

### Media Links Response
- `GET /v1/items/media-links?mid=<id>` returns `MediaLinks` directly at root level: `{id, files, subtitles, thumbnail}`
- NOT wrapped in `{item: ...}` like other endpoints — do NOT use `SingleResponse<T>` wrapper

### Tizen Package ID
- Must be exactly 10 alphanumeric characters (e.g., `evekeen001`) — 9 characters causes "Load archive info fail" on install
- App ID format: `<packageId>.<AppName>` (e.g., `evekeen001.KinoPub`)

### .wgt Signing
- Tizen 9.0+ (2025 TVs) requires signed .wgt — unsigned packages fail with "Load archive info fail"
- Sign with: `tizen package -t wgt -s <profile-name> -- dist/`
- Samsung certificate must include TV's DUID (get via `sdb shell 0 getduid`)

### sdb Connection on Tizen 9.0 (2025 TVs)
- After every TV restart, sdb connection must be re-authorized via **Tizen Device Manager GUI** (`open ~/tizen-studio/tools/device-manager/bin/device-manager.app`)
- Connect to the TV IP in Device Manager first — this triggers a consent dialog on the TV screen
- Only after accepting the GUI consent will `sdb connect <TV_IP>` work from CLI
- This approval is lost on TV restart — must repeat the Device Manager step each time

### On-Device Debugging
- Launch in debug mode: `sdb shell 0 debug <appId>` — returns a debug port
- Connect Chrome DevTools Protocol via WebSocket at `ws://<TV_IP>:<port>/devtools/page/<id>`
- Get target ID: `curl http://<TV_IP>:<port>/json`
- Can evaluate JS, read console logs, and dispatch key events remotely via CDP

## API Client Rules

### Token Refresh Mutex

Two concurrent 401 responses must not both attempt to refresh the token — kino.pub invalidates the old refresh token on each refresh. Use a promise-based lock:
```typescript
let refreshPromise: Promise<string> | null = null;
async function getValidToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  return refreshPromise;
}
```

### Error Classification

- 401 → trigger token refresh + retry
- 403 → show "subscription required" message
- Network error → show NetworkError component with retry
- 5xx → show "server error, try again later"
- Retry network errors with exponential backoff (not 4xx)

## Navigation & Focus

### Spatial Navigation

Use `@noriginmedia/norigin-spatial-navigation` with `useFocusable()` hook on all interactive elements.

### Focus Restoration on Back

The navigation stack stores `lastFocusKey` per screen entry. On `goBack()`, call `setFocus(lastFocusKey)` to restore the exact element that was focused before navigating away. This is the most important UX detail on TV.

### Focus Containment on Overlays

`TrackPicker` and `PlayerOverlay` must use their own `FocusContext` from norigin to prevent D-pad focus from escaping to the sidebar or content behind.

### ContentRail Focus Memory

Each `ContentRail` uses `preferredChildFocusKey` so when the rail regains focus (user presses Down from the rail above), it focuses the previously-focused card, not the first card.

### Virtualization

Focus-driven, not scroll-driven:
- Horizontal rails: render `focusedIndex ± 5` cards, translate with `transform: translateX(...)`
- Vertical rail list: render `focusedRailIndex ± 1` rails
- Never use react-window (designed for mouse/scroll, fights focus-driven TV nav)

## Subtitles

- kino.pub provides external SRT files via `media-links` endpoint
- SRT files may be Windows-1251 encoded (Cyrillic) — fetch as ArrayBuffer, detect encoding, decode with appropriate TextDecoder
- SRT files may contain HTML tags (`<i>`, `<b>`, `<font>`) — sanitize before rendering (no raw innerHTML)
- Render as positioned overlay at bottom of video with text-shadow for readability

## Testing

### Unit Tests (Vitest)

- Test files colocated with source: `Component.test.tsx` next to `Component.tsx`
- Test API client functions with mocked fetch
- Test Zustand stores in isolation
- Test hooks with `@testing-library/react-hooks`
- Test SRT parser with various encodings and edge cases
- All new features and bug fixes must have tests

### Storybook

- Stories in `stories/` directory
- Every new component needs a Storybook story with representative variants
- Stories should show focused/unfocused states (critical for TV UX)
- Run Storybook to verify component appearance before committing
- Never add Storybook-specific code to production components — only in stories/decorators

### Tizen Testing

- Test on real Samsung TV hardware (oldest available model preferred)
- Test the full flow: auth → browse → play → audio switch → subtitles → seek → back → search
- Test VPN drop during playback (unplug ethernet, verify retry overlay)
- Test with Tizen Studio emulator for quick iteration (but always verify on real hardware before release)

## 10-Foot UI Design Guidelines

- Minimum 24px body text, 32px+ titles (readable from 3 meters / 10 feet)
- 5% overscan-safe margins on all sides
- High-contrast focus indicators visible from couch distance
- Focus ring using `:focus` (not `:focus-visible`) + 3px solid outline
- Generous spacing between focusable elements (minimum 48px touch targets equivalent)
- Screen transitions: 150ms opacity fade (CSS `transition: opacity 150ms`)
- All colors must meet high contrast requirements — TV panels have lower contrast than monitors
- sRGB color space only

## Git Commits

- Brief, focused commit messages
- Use conventional commit format (fix:, feat:, refactor:, etc.)
- Never mention AI tools or code generation
- Never force push
- Organize by feature/impact, never by layer

## Workflow

1. Research and brainstorm before implementation
2. Write code
3. Run code review (code-reviewer agent) before committing
4. Run architecture review (code-architecture-reviewer agent) before committing
5. Fix all findings
6. Run `npm run typecheck && npm run lint && npm run test && npm run build`
7. Commit

## Implementation Plan

See `docs/plans/2026-04-05-kinopub-tizen-app.md` for the full task breakdown (17 tasks).
