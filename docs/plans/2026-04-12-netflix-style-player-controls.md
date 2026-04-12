# Netflix-Style Two-Row Player Controls

## Context

The player overlay currently uses a single-row layout:

```
[Play/Pause]  [====== Progress Bar ======]  [CC Button]
```

When the overlay appears, focus goes to the progress bar. Left/Right arrows on the progress bar seek ±10s. This makes the CC (subtitle/audio) button unreachable via D-pad because Left/Right is consumed by seeking before spatial navigation can move focus to the CC button.

Users cannot switch subtitle or audio tracks without a workaround. This is a broken UX on a TV app where D-pad is the only input.

## Approach

Adopt the Netflix TV player two-row pattern where Left/Right behavior differs per row:

```
[====== Progress Bar ======]                  ← Row 1: Left/Right = SEEK ±10s
[⏪ RW]  [⏸ Play/Pause]  [⏩ FF]  [CC]      ← Row 2: Left/Right = NAVIGATE between buttons
```

- **Up/Down** switches between the progress bar row and the transport buttons row
- **Left/Right on progress bar** (row 1): seeks ±10s (unchanged behavior)
- **Left/Right on button row** (row 2): spatial navigation between buttons (standard norigin behavior)
- **Default focus**: progress bar when overlay appears (seeking is the most common intent)
- **Down** from progress bar → focuses play/pause (center of button row)
- **Up** from button row → focuses progress bar
- **Enter** on CC button → opens TrackPicker sidebar (unchanged)

This completely eliminates the conflict. The Rewind/FastForward buttons in the button row provide a secondary seeking method (±30s jumps matching the existing remote key behavior) for users who discover them.

### Key decisions

- **Rewind/FF buttons use 30s jumps** (not 10s) to differentiate from the progress bar's 10s seek. Matches the existing `SEEK_JUMP_S = 30` used by the MediaFastForward/MediaRewind remote keys in PlayerPage.
- **Button row is centered horizontally** using flexbox `justify-content: center` with spacing between items, matching Netflix's centered transport bar.
- **Progress bar keeps its own Left/Right interception** via the capture-phase keydown listener — no changes needed to ProgressBar.tsx.
- **norigin spatial navigation handles button row navigation** — the four buttons are focusable children in a flex row, so Left/Right works automatically.
- **FocusBoundary stays on the overlay** — the two rows are inside the same FocusContext, and norigin handles Up/Down between rows naturally since the progress bar div is positioned above the buttons div.

### What stays the same

- ProgressBar component internals (seeking logic, preview, timing)
- TrackPicker component (sidebar modal, focus trapping, back key handling)
- Auto-hide timer (5s)
- Overlay show/hide on any keypress
- PlayerPage remote key mapping (MediaFF/RW, Play/Pause, Stop, Back)

## Files

### Modified files

- `src/components/Player/PlayerOverlay.tsx` — restructure from single-row to two-row layout, add RW/FF buttons as focusable elements, update focus tracking state
- `src/components/Player/PlayerOverlay.module.css` — add button row styles, rework bottomBar layout from single flex row to two stacked rows
- `src/pages/PlayerPage.tsx` — pass `onSeekForward`/`onSeekBackward` callbacks to PlayerOverlay for the RW/FF buttons

### No changes needed

- `src/components/Player/ProgressBar.tsx` — progress bar behavior unchanged
- `src/components/Player/ProgressBar.module.css` — no changes
- `src/components/Player/TrackPicker.tsx` — track picker unchanged
- `src/components/Player/TrackPicker.module.css` — no changes
- `src/hooks/useRemoteKeys.ts` — remote key mapping unchanged

## Tasks

### Task 1: Restructure PlayerOverlay to two-row layout

Restructure the bottom bar from a single flex row into two stacked rows: progress bar on top, transport buttons below.

- [ ] In `PlayerOverlay.tsx`, update the `focusedElement` state type from `'playPause' | 'progress' | 'tracks'` to `'rewind' | 'playPause' | 'fastForward' | 'progress' | 'tracks'`
- [ ] Add two new props to `PlayerOverlayProps`:
  ```typescript
  onSeekForward: () => void;
  onSeekBackward: () => void;
  ```
- [ ] Add `useFocusable` hooks for the two new buttons:
  ```typescript
  const { ref: rewindRef } = useFocusable({
    onEnterPress: onSeekBackward,
    focusKey: 'player-overlay-rewind',
    onFocus: handleRewindFocus,
  });
  const { ref: ffRef } = useFocusable({
    onEnterPress: onSeekForward,
    focusKey: 'player-overlay-ff',
    onFocus: handleFfFocus,
  });
  ```
- [ ] Add focus handlers `handleRewindFocus` and `handleFfFocus` following the existing `handlePlayPauseFocus` pattern (each sets `focusedElement` to `'rewind'` / `'fastForward'`)
- [ ] Restructure the JSX in `bottomBar` from one `.controls` row to two rows:
  ```tsx
  <div className={styles.bottomBar}>
    <div ref={progressRef} className={styles.progressRow}>
      <ProgressBar ... />
    </div>
    <div className={styles.buttonRow}>
      <div ref={rewindRef} className={...}>⏪</div>
      <div ref={playPauseRef} className={...}>⏸</div>
      <div ref={ffRef} className={...}>⏩</div>
      {hasExtraTracks && (
        <div ref={tracksBtnRef} className={...}>CC</div>
      )}
    </div>
  </div>
  ```
- [ ] Use Unicode characters for button icons: `\u23EA` (⏪ rewind), `\u23E9` (⏩ fast forward), existing `playPauseIcon` for play/pause
- [ ] Remove the old `.controls` div and `.progressWrapper` div — the progress bar now occupies its own full-width row
- [ ] Keep the default focus target as `'player-overlay-progress'` in the `useEffect` (line 171-177)
- [ ] Handle focus styling for rewind/ff buttons using the same pattern as playPause — check `focusedElement === 'rewind'` / `focusedElement === 'fastForward'` to pick focused vs unfocused class

**DoD:** `npm run typecheck && npm run lint` passes. Overlay renders with progress bar on top row and four buttons (RW, Play/Pause, FF, CC) on bottom row. Down arrow from progress bar moves focus to button row. Left/Right on button row navigates between buttons. Left/Right on progress bar still seeks.

### Task 2: Update PlayerOverlay CSS for two-row layout

Restyle the bottom bar to accommodate two stacked rows.

- [ ] Remove the `.controls` class (no longer used)
- [ ] Remove the `.progressWrapper` class (no longer used)
- [ ] Add `.progressRow` class:
  ```css
  .progressRow {
    margin-bottom: 16px;
  }
  ```
- [ ] Add `.buttonRow` class:
  ```css
  .buttonRow {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }
  ```
- [ ] Add `.transportButton` and `.transportButtonFocused` classes for RW/FF buttons, following the existing playPause sizing (56x56px circle, same focus ring):
  ```css
  .transportButton {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: rgba(255, 255, 255, 0.8);
    flex-shrink: 0;
    border-radius: 50%;
    margin: 0 12px;
  }
  .transportButtonFocused {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: #ffffff;
    flex-shrink: 0;
    border-radius: 50%;
    margin: 0 12px;
    background-color: rgba(255, 255, 255, 0.2);
    border: 2px solid #ffffff;
  }
  ```
- [ ] Add `margin: 0 12px` to `.playPause` and `.playPauseFocused` to space them evenly in the centered row
- [ ] Add `margin: 0 12px` to `.tracksButton` and `.tracksButtonFocused` similarly
- [ ] Verify no CSS custom properties (`var(--*)`) are used — Chromium M47 constraint
- [ ] Verify no `gap` property on flexbox — use margins instead

**DoD:** `npm run build` passes. Visually: progress bar spans full width on its own row. Below it, four buttons (RW, Play/Pause, FF, CC) are centered horizontally with even spacing. Focus ring appears on the active button. No CSS `var()`, `gap`, or other M47-incompatible features.

### Task 3: Wire PlayerPage to pass seek callbacks

Connect the new RW/FF overlay buttons to the existing seek logic in PlayerPage.

- [ ] In `PlayerPage.tsx`, create `handleSeekForward` and `handleSeekBackward` callbacks:
  ```typescript
  const handleSeekForward = useCallback((): void => {
    handleSeek(currentTimeRef.current + SEEK_JUMP_S);
  }, [handleSeek]);

  const handleSeekBackward = useCallback((): void => {
    handleSeek(Math.max(0, currentTimeRef.current - SEEK_JUMP_S));
  }, [handleSeek]);
  ```
- [ ] Pass them to `<PlayerOverlay>`:
  ```tsx
  <PlayerOverlay
    ...existing props...
    onSeekForward={handleSeekForward}
    onSeekBackward={handleSeekBackward}
  />
  ```

**DoD:** `npm run typecheck && npm run lint` passes. Pressing Enter on the RW button in the overlay seeks backward 30s. Pressing Enter on the FF button seeks forward 30s.

### Task 4: Update tests and verify build

- [ ] Run `npm run typecheck` — verify no type errors
- [ ] Run `npm run lint` — verify no linting errors
- [ ] Run `npm run test` — all 222+ tests pass (ProgressBar.test.tsx should be unaffected since only `formatTime` is tested)
- [ ] Run `npm run build` — production build succeeds
- [ ] Verify in browser (`npm run dev`):
  - Overlay appears on any keypress during playback
  - Progress bar is focused by default, Left/Right seeks ±10s
  - Down arrow moves focus to Play/Pause button in transport row
  - Left/Right navigates between RW, Play/Pause, FF, CC buttons
  - Up arrow from button row returns to progress bar
  - Enter on CC opens TrackPicker sidebar
  - Back key closes TrackPicker, returns focus to CC button
  - Enter on RW/FF seeks ±30s
  - Overlay auto-hides after 5s (unless TrackPicker is open)

**DoD:** `npm run typecheck && npm run lint && npm run test && npm run build` all pass. All manual verification items above confirmed in browser.
