# Fix Episode Watched Marking and Auto-Resume Next Unwatched

## Context

Episodes the user watches in the Tizen app are not being marked as watched. Even after watching a serial episode past 90% completion, the episode list still shows the episode as unwatched on subsequent visits. Three previous fix attempts did not resolve the underlying bug:

- `4f99fd4` (fix: search focus, watched status, ...) — added watched-status handling but kept the wrong `video` parameter contract.
- `51c2a17` (feat: resume position, auto-watched, ...) — added the 90% auto-toggle in `PlayerPage`, still passing the wrong identifier.
- `a84d8cc` (fix: ...90% watched, API body→query, ...) — moved POST body to query string (turned silent 400s into silent 404s) and added the `season` param, but still sent `video=<server-side videoId>`.

### Root cause

The kino.pub `/v1/watching/marktime` and `/v1/watching/toggle` endpoints expect `video` to be the **1-based episode/video number** (the `Video.number` field for a serial episode within its season, or `1` for a movie). The code currently sends `Video.id` — a globally unique server-side identifier like `123456`. The server cannot match that to any episode in the season, returns 404, and the `.catch(() => {})` swallows the error.

This was independently confirmed against three reference clients:
- Quarckster's Kodi addon (production)
- Valera's LG webOS client (with original Russian JSDoc from the kino.pub API description)
- The unofficial OpenAPI spec

All three pass `video=<1-based number>` and `season=<1-based number>`. The Kodi addon explicitly passes `status=1` to `watching/toggle` rather than relying on flip behavior.

### Why tests didn't catch it

- `src/hooks/usePlaybackSync.test.ts:54` asserts `markTime` is called with whatever args came in (`(1, 2, 120)`); it never inspects the URL/query string actually sent to `api.service-kp.com`. The test rubber-stamps the bug.
- No `src/api/watching.test.ts` exists — the URL builder for these endpoints has zero coverage.
- No `PlayerPage.test.tsx` exists — the 90%-trigger logic is uncovered.
- The Playwright e2e mock at `e2e/helpers/mock-api.ts:104-111` returns a generic `{status: 200}` for every URL containing `/watching`, so any value of `video` looks valid in e2e. No e2e test re-fetches the item to assert `episode.watched === 1`.

### Secondary problem

Serial content pages have no Play action — only the focus on the next-unwatched episode card. The user has to D-pad over and press Enter manually. The user wants pressing Play to **automatically start the next unwatched episode** (or resume the in-progress one), matching the Netflix TV pattern.

## Approach

### Watched-marking fix

1. **Change the `video` argument from a server-side ID to a 1-based episode number** at every call site:
   - `markTime(itemId, videoNumber, time, seasonNumber?)`
   - `toggleWatched(itemId, videoNumber, seasonNumber?, status?)`
2. **Plumb `episodeNumber` through `ScreenParams`** (already declared on the type at `src/store/ui.ts:18`, just unused by the watching calls) and use it in the player.
3. **For movies, pass `video=1`** (kino.pub convention — single-video items are always video #1).
4. **Add explicit `status=1` on the 90%-auto-mark** so the call sets the state rather than flipping it. This avoids the un-marking edge case if the server already considers the episode in progress with `status=0`.
5. **Stop swallowing watching errors silently.** Replace `.catch(() => {})` with a logger that surfaces failures in dev (and to a future debug overlay) so this class of bug can't hide again.

### Auto-resume fix

1. **Add a Play / Resume button** to the serial `ContentPage` action row, next to Bookmark/Subscribe. The button label switches between "Play" (no progress yet) and "Resume" (`watched===0` exists somewhere).
2. The button uses the existing `findResumePoint` logic in `src/pages/ContentPage.tsx:31-56` to pick the right episode — first an in-progress one (`watched===0`), otherwise the episode after the last fully-watched one (`watched===1`), otherwise S1E1.
3. Default focus on the serial page becomes this Play/Resume button (today it goes to `episode-list`); the episode list is still reachable via Down.

### Test strategy that would have caught this

- **`src/api/watching.test.ts`** — spy on `fetch`, assert exact URL: `https://api.service-kp.com/v1/watching/toggle?id=42&video=3&season=2&status=1`. This pins the contract.
- **`src/pages/PlayerPage.test.tsx`** — mount with `episodeNumber=3, seasonNumber=2`, fire `timeupdate` events past 90% duration, assert `toggleWatched` called with `(42, 3, 2, 1)`.
- **Stricter e2e mock** — return 404 when `video` is not a small integer (≤ 50), so future regressions to "passing the ID by accident" fail in CI.
- **End-to-end watched flow** — play past 90%, navigate back, re-fetch, assert the watched indicator is rendered. Requires the e2e mock to honor the toggle and update the serial detail fixture in-memory.

### Alternatives considered

- **Auto-mark via `status=1` with no flip support at all.** Rejected — keeping the flip path lets users mark/unmark manually from the episode list later (future feature).
- **Send `video=Video.id` and rely on a server-side change.** Rejected — kino.pub is a third-party API, we don't control it.
- **Computing `video` from `episode.number` in the watching API layer by looking up the episode.** Rejected — the API layer should be dumb; the page (which has the `Video` object) is the right place to extract `number`.

## Files

### New files

- `src/api/watching.test.ts` — contract test for `markTime` / `toggleWatched` URL building. Spies `fetch`, asserts exact query strings for movie + serial cases, including `status=1` on auto-mark.
- `src/pages/PlayerPage.test.tsx` — verifies the 90%-trigger calls `toggleWatched` with `(itemId, episodeNumber, seasonNumber, 1)` and only fires once per session even when crossing 90% repeatedly.
- `src/utils/logger.ts` — tiny dev-only logger (`logWatchingError(context, err)`) that `console.warn`s in dev and is a no-op in production builds. Replaces silent `.catch(() => {})`.

### Modified files

- `src/api/watching.ts` — change `markTime` and `toggleWatched` signatures so `video` is a 1-based number, add optional `status` param to `toggleWatched`. Drop the local `body` builder duplication and call `apiPost` with the params object.
- `src/store/ui.ts` — no shape change (already has `episodeNumber`), but add a brief comment-free assertion that `episodeNumber` is plumbed when navigating to player.
- `src/pages/PlayerPage.tsx` — read `episodeNumber` and `mediaId` separately; for the 90% auto-mark and pause/back markTime, send `episodeNumber ?? 1` (movies → 1) instead of `mediaId`. Remove `.catch(() => {})` swallows in favor of `logWatchingError`.
- `src/hooks/usePlaybackSync.ts` — rename `videoId` parameter to `videoNumber`, update the type and the JSDoc-equivalent rename throughout. Stop swallowing errors — log them.
- `src/hooks/usePlaybackSync.test.ts` — update existing tests to reflect new parameter semantics, and add a test that verifies `markTime` is called with the **video number**, not the video id, for serial episodes.
- `src/pages/ContentPage.tsx` — add a Play/Resume button for serials (`kind === 'serial'`) that runs `findResumePoint`, then `navigateWithFocus('player', ...)` with the resolved `seasonNumber`/`episodeNumber`/`resumeTime`/`alreadyWatched`. Make this the default focus on serial pages.
- `src/pages/ContentPage.test.tsx` — add tests for: (a) the new Play/Resume button is rendered on serials, (b) it picks the in-progress episode when one exists, (c) it picks the next-after-last-watched when none in progress, (d) it picks S1E1 for a fresh serial.
- `e2e/helpers/mock-api.ts` — replace the catch-all `/watching` route with a stricter handler that 404s on unrecognized `video` values and updates an in-memory "watched" map for `watching/toggle`. Serve serial-detail with that map applied so re-fetch reflects the watched state.
- `e2e/player.spec.ts` — add a test that simulates >90% playback (via `page.evaluate` to dispatch `timeupdate` after seeking the `<video>` element to 95% of duration), backs out, and asserts the episode card now shows the watched indicator.

## Tasks

### Task 1: Fix the `video` parameter contract in the watching API client

Change `markTime` and `toggleWatched` so callers pass a 1-based video/episode NUMBER, and add an explicit `status` param for `toggleWatched`.

- [x] In `src/api/watching.ts`, update `markTime` signature:
  ```typescript
  export async function markTime(
    itemId: number,
    videoNumber: number,
    time: number,
    seasonNumber?: number,
  ): Promise<StatusResponse>
  ```
  Build params: `{ id: itemId, video: videoNumber, time, season: seasonNumber }` (omit `season` when undefined — `apiPost`/`buildUrl` already drops `undefined`).
- [x] In `src/api/watching.ts`, update `toggleWatched` signature:
  ```typescript
  export async function toggleWatched(
    itemId: number,
    videoNumber: number,
    seasonNumber?: number,
    status?: 0 | 1,
  ): Promise<StatusResponse>
  ```
  Build params: `{ id: itemId, video: videoNumber, season: seasonNumber, status }`. Remove the local `body` object builder — let `buildUrl`'s `undefined`-skip handle optional fields.
- [x] Keep the function names (`markTime`, `toggleWatched`) — only signatures change. This minimizes diff churn at call sites.

**DoD:** `npm run typecheck` passes after call sites are updated in later tasks. The watching client compiles standalone with the new signatures. No production runtime change yet (call sites still pass `videoId` in this task — verify that compile fails with a meaningful "expected number" error proving the type pinned correctly).

### Task 2: Add a contract test for the watching API client

Pin the exact URL/query string sent for both `marktime` and `toggle` so future "swap the ID back in" regressions fail in CI.

- [x] Create `src/api/watching.test.ts`. Mock `localStorage.getItem` to return a stub access token. Spy on `globalThis.fetch` and assert it returns `{ ok: true, status: 200, json: async () => ({ status: 200 }) }`.
- [x] Test 1 — `markTime` for a serial episode:
  ```typescript
  await markTime(42, 3, 1234, 2);
  expect(fetch).toHaveBeenCalledWith(
    'https://api.service-kp.com/v1/watching/marktime?id=42&video=3&time=1234&season=2',
    expect.objectContaining({ method: 'POST' }),
  );
  ```
- [x] Test 2 — `markTime` for a movie:
  ```typescript
  await markTime(42, 1, 600);
  expect(fetch).toHaveBeenCalledWith(
    'https://api.service-kp.com/v1/watching/marktime?id=42&video=1&time=600',
    expect.anything(),
  );
  ```
  Assert no `season=` substring in the URL.
- [x] Test 3 — `toggleWatched` with explicit `status=1`:
  ```typescript
  await toggleWatched(42, 3, 2, 1);
  expect(fetch).toHaveBeenCalledWith(
    'https://api.service-kp.com/v1/watching/toggle?id=42&video=3&season=2&status=1',
    expect.objectContaining({ method: 'POST' }),
  );
  ```
- [x] Test 4 — `toggleWatched` for a movie without `status` (flip mode): URL has `id=42&video=1`, no `season`, no `status`.
- [x] Test 5 — Authorization header is `Bearer <stub-token>`.

**DoD:** `npm run test -- watching` passes. All five cases assert the EXACT URL string. If anyone reverts the `video` change, these tests fail with a clear `expected video=3 got video=12345` style diff.

### Task 3: Add a tiny dev-only error logger and stop swallowing watching errors

Replace silent `.catch(() => {})` with a logger so a future recurrence of this bug is visible during development.

- [ ] Create `src/utils/logger.ts`:
  ```typescript
  export function logWatchingError(context: string, error: unknown): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[watching] ' + context, error);
    }
  }
  ```
- [ ] In `src/hooks/usePlaybackSync.ts`, replace the two `.catch(() => {})` calls (interval + unmount) with `.catch((err: unknown) => logWatchingError('markTime', err))`.
- [ ] In `src/pages/PlayerPage.tsx`, replace the two `.catch(() => {})` calls (handleBack markTime and 90% toggleWatched) similarly. Use distinct context strings: `'markTime:back'`, `'toggleWatched:90%'`.

**DoD:** `npm run lint` passes (the per-line eslint-disable for `no-console` is the only console call in production code paths). In dev, calling `markTime` with a forced 404 logs a warning. In a production build (`import.meta.env.DEV === false`), the logger is a no-op.

### Task 4: Wire `episodeNumber` through to `markTime` and `toggleWatched` in PlayerPage

Use `episodeNumber` from `screenParams` (movies → fallback to `1`) for all watching calls. This is the actual fix.

- [ ] In `src/pages/PlayerPage.tsx`, read `episodeNumber` from the store at the top with the other screen params:
  ```typescript
  const episodeNumber = useUiStore((s) => s.screenParams.episodeNumber);
  ```
- [ ] Compute a `videoNumber` constant once: `const videoNumber = episodeNumber ?? 1;`
- [ ] Update the `handleBack` markTime call (currently `markTime(contentId, mediaId, time)`) to:
  ```typescript
  markTime(contentId, videoNumber, time, seasonNumber)
  ```
- [ ] Update the 90%-trigger `toggleWatched` call (currently `toggleWatched(contentId, mediaId, seasonNumber)`) to:
  ```typescript
  toggleWatched(contentId, videoNumber, seasonNumber, 1)
  ```
  Note the explicit `status=1` — sets watched, never un-marks.
- [ ] Update the `usePlaybackSync(contentId, mediaId, ...)` call to pass `videoNumber` instead of `mediaId`. This requires updating the hook signature in Task 5.
- [ ] Add `videoNumber` to the dependency array of the effect that registers the timeupdate listener (currently has `mediaId`).

**DoD:** `npm run typecheck` passes. Dev build: open a serial episode S2E3, watch >90%, the dev console shows no `[watching]` warnings. Re-open the content page and the episode shows watched (UI confirmation in Task 6).

### Task 5: Rename `videoId` → `videoNumber` in `usePlaybackSync`

Make the parameter name match the actual semantics so this doesn't get re-confused at the next call site.

- [ ] In `src/hooks/usePlaybackSync.ts`, rename the second parameter from `videoId` to `videoNumber` and the inner refs (`videoIdRef` → `videoNumberRef`).
- [ ] Add a third optional parameter `seasonNumber?: number` and a fourth ref for it. Pass it through to `markTime`.
- [ ] In `src/hooks/usePlaybackSync.test.ts`:
  - Rename test arguments to reflect the new semantics. The numeric values (`1`, `2`) stay the same — they just mean different things now.
  - Add one new test:
    ```typescript
    it('passes seasonNumber to markTime for serial episodes', () => {
      const getCurrentTime = vi.fn(() => 120);
      renderHook(() => usePlaybackSync(42, 3, getCurrentTime, true, 2));
      vi.advanceTimersByTime(30000);
      expect(markTime).toHaveBeenCalledWith(42, 3, 120, 2);
    });
    ```
  - Add a regression-guard test that fails if `videoNumber` is large (asserts callers must pass small 1-based numbers, not 6-digit IDs):
    ```typescript
    it('passes a small 1-based video number, not a server-side ID (regression guard)', () => {
      const getCurrentTime = vi.fn(() => 60);
      renderHook(() => usePlaybackSync(42, 3, getCurrentTime, true, 2));
      vi.advanceTimersByTime(30000);
      const call = (markTime as unknown as { mock: { calls: number[][] } }).mock.calls[0];
      const videoArg = call[1];
      expect(videoArg).toBeLessThan(100);
    });
    ```

**DoD:** `npm run test -- usePlaybackSync` passes including the two new tests. `npm run typecheck` passes. The regression-guard test fails if anyone passes `mediaId` (a 6-digit number) instead of `episodeNumber`.

### Task 6: Add a Play / Resume button to serial ContentPage

Make the next-unwatched episode reachable with one button press from the content page.

- [ ] In `src/pages/ContentPage.tsx`, derive the resume target once when rendering serials:
  ```typescript
  const resumePoint = kind === 'serial' && item.seasons
    ? findResumePoint(item.seasons)
    : null;
  ```
  (already exists — keep as-is)
- [ ] Compute the button label:
  ```typescript
  function getResumeLabel(point: ResumePoint | null): string {
    if (point === null) return 'Play';
    if (point.time > 0) return 'Resume';
    return 'Play';
  }
  ```
  (Pure function above the component, no comments needed — name is self-documenting.)
- [ ] Add a `handleResumeSerial` callback (above `handleSelectEpisode`):
  ```typescript
  const handleResumeSerial = useCallback((): void => {
    if (item === null || !item.seasons) return;
    const point = findResumePoint(item.seasons);
    const target = point !== null
      ? item.seasons[point.seasonIndex].episodes[point.episodeIndex]
      : item.seasons[0]?.episodes[0];
    if (target === undefined) return;
    const episodeTitle = item.title + ' S' + target.snumber + 'E' + target.number;
    const resumeTime = target.watched !== 1 && target.watching.time > 0
      ? target.watching.time
      : 0;
    navigateWithFocus('player', {
      params: {
        contentId: item.id,
        mediaId: target.id,
        seasonNumber: target.snumber,
        episodeNumber: target.number,
        title: episodeTitle,
        resumeTime,
        alreadyWatched: target.watched === 1,
      },
    });
  }, [item, navigateWithFocus]);
  ```
- [ ] Render the button inside the `actions` div, BEFORE Subscribe/Bookmark, only when `kind === 'serial'`:
  ```tsx
  {kind === 'serial' && item.seasons && item.seasons.length > 0 && (
    <ActionButton
      label={getResumeLabel(resumePoint)}
      focusKey="content-play-button"
      onPress={handleResumeSerial}
      active={false}
    />
  )}
  ```
  The existing `kind === 'movie'` Play button keeps its existing logic.
- [ ] Update the default-focus effect to focus `content-play-button` for serials too (not just movies). The existing branch is at `src/pages/ContentPage.tsx:171-177`:
  ```typescript
  const focusTarget = kind === 'movie' || (kind === 'serial' && resumePoint !== null)
    ? 'content-play-button'
    : 'episode-list';
  ```
  For a brand-new serial with no progress, `resumePoint` is non-null (returns S1E1 fallback) — so default focus lands on the Play button. For a serial fully watched (every episode `watched===1`), `findResumePoint` returns `null` and we fall back to episode list, which is reasonable.

**DoD:** `npm run typecheck && npm run lint && npm run test && npm run build` passes. Open a serial in the dev browser: the Play button is the leftmost action and is focused by default. Pressing Enter starts the next-unwatched episode. For a serial with an in-progress episode, label reads "Resume". For a fresh serial, label reads "Play" and starts S1E1.

### Task 7: Add a PlayerPage test for the 90% auto-mark trigger

Verify the 90%-watched logic calls `toggleWatched` with the right args, exactly once per session.

- [ ] Create `src/pages/PlayerPage.test.tsx`. Mock `../api/watching`, `../api/media`, `../contexts/PlayerContext`, and `../hooks/useSubtitles` — only the watching mock needs to track calls.
- [ ] Set up `useUiStore` with `screenParams: { contentId: 42, mediaId: 99999, seasonNumber: 2, episodeNumber: 3, alreadyWatched: false }`.
- [ ] Mock `usePlayerContext` to return a fake `videoRef` whose `current` is a fake `<video>`-like element. Manually dispatch `timeupdate` events with controlled `currentTime`/`duration` values.
- [ ] Test 1 — fires once at 90%: dispatch `timeupdate` with `currentTime: 891, duration: 990` (90.0%). Assert:
  ```typescript
  expect(toggleWatched).toHaveBeenCalledTimes(1);
  expect(toggleWatched).toHaveBeenCalledWith(42, 3, 2, 1);
  ```
- [ ] Test 2 — does not fire below 90%: dispatch `timeupdate` with `currentTime: 800, duration: 990`. Assert `toggleWatched` not called.
- [ ] Test 3 — does not double-fire: dispatch `timeupdate` at 89%, then 90%, then 95%. Assert `toggleWatched` called exactly once.
- [ ] Test 4 — skipped when `alreadyWatched: true`: re-render with that screen param and dispatch `timeupdate` at 95%. Assert `toggleWatched` not called.
- [ ] Test 5 — for a movie (`episodeNumber: undefined, seasonNumber: undefined`), uses `video=1`:
  ```typescript
  expect(toggleWatched).toHaveBeenCalledWith(42, 1, undefined, 1);
  ```

**DoD:** `npm run test -- PlayerPage` passes. All five cases verify the 90% trigger contract. Test 1 directly proves the original bug is fixed (regression guard).

### Task 8: Tighten the e2e mock and add a watched-flow e2e test

Make the e2e suite catch this class of bug instead of rubber-stamping it.

- [ ] In `e2e/helpers/mock-api.ts`, replace the catch-all `/watching` handler with explicit handling:
  - Maintain an in-memory `watchedMap: Map<string, 0 | 1>` keyed by `${itemId}:${seasonNumber ?? 0}:${videoNumber}`.
  - For `watching/toggle`: parse query params; if `video` is missing or > 50, return 404 (simulates kino.pub rejecting bogus video numbers); otherwise update `watchedMap` and return `{status: 200, watched: 1}`.
  - For `watching/marktime`: similarly validate `video` is a small integer; return `{status: 200}`.
  - For `watching/serials` / `watching/movies`: return empty list (existing behavior).
- [ ] In the same file, when serving `/items/2001` (the serial fixture), post-process the JSON: walk `item.seasons[*].episodes[*]` and set `watched: 1` for any `(snumber, number)` pair present in `watchedMap`. This makes re-fetches reflect prior toggles.
- [ ] Add a new fixture `e2e/fixtures/item-detail-serial.json` (or update existing) so `seasons[0].episodes[0]` has `number: 1, snumber: 1, watched: -1`. Pick a serial with at least 3 episodes to make the test meaningful.
- [ ] In `e2e/player.spec.ts`, add a new test:
  ```typescript
  test('watching past 90% marks episode as watched on return', async ({ page }) => {
    // navigate to serial → episode 1
    // simulate playback past 90%:
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      Object.defineProperty(video, 'duration', { value: 1000, configurable: true });
      Object.defineProperty(video, 'currentTime', { value: 950, configurable: true });
      video.dispatchEvent(new Event('timeupdate'));
    });
    await page.waitForTimeout(500);
    // back to content page
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1500);
    // assert the watched indicator is rendered for episode 1
    const watchedDot = page.locator('[class*="watchedDone"]').first();
    await expect(watchedDot).toBeVisible({ timeout: 3000 });
  });
  ```
- [ ] Add a second e2e test that verifies the Play/Resume button on a serial:
  ```typescript
  test('serial Play button starts next unwatched episode', async ({ page }) => {
    // navigate to a serial whose episode 1 is already watched
    // (use the watchedMap to seed this state via a setup call)
    // assert Play button label is "Resume" or "Play"
    // press Enter, assert player loads with episodeNumber === 2
  });
  ```
  Inspect the player by reading `useUiStore.getState().screenParams.episodeNumber` via `page.evaluate`.

**DoD:** `npm run e2e -- player` passes (or the project's e2e command per `package.json`). The new mock returns 404 if `video` is sent as a 6-digit ID, which would have caught the original bug. Both new e2e tests pass.

### Task 9: Final validation

Full check across the stack and a manual sanity pass on real hardware.

- [ ] Run `npm run typecheck && npm run lint && npm run test && npm run build` — all green.
- [ ] Run `npm run e2e` — all green including the two new tests.
- [ ] Build the .wgt and deploy to the Samsung TV (`bash scripts/deploy-tv.sh` per CLAUDE.md).
- [ ] On TV, manual flow:
  - Open a serial that has zero progress. Confirm Play button is focused by default and label reads "Play". Press Enter — S1E1 starts.
  - Watch >90% (or seek to ~95%, let it play 5s). Press Back. Confirm episode 1 shows the green "watched" indicator on the episode list.
  - Re-open the serial from Home. Confirm Play button label now reads "Play" (focuses next unwatched, episode 2). Press Enter — episode 2 starts.
  - Pause mid-episode 2 around 30% completion. Press Back. Re-open the serial. Confirm Play button label reads "Resume" and pressing Enter resumes episode 2 from the saved position.
  - Open a movie. Confirm the existing movie Play button still works and re-opening shows resume position correctly.
- [ ] Code review with `code-reviewer` agent. Architecture review with `code-architecture-reviewer` agent. Address all findings.
- [ ] Commit with message: `fix: episode watched marking — use 1-based video number, add serial Play/Resume`. No AI attribution.

**DoD:** All automated checks pass. All manual TV checks pass. Reviews are clean. The `[watching]` dev-warning never fires during the manual flow (proves no silent failures remain). The PR description references this plan and explains the root cause + why prior fixes missed it.
