# KinoPub Tizen - On-Device Test Checklist

TV Model: _______________
TV Year: _______________
Tizen Version: _______________
Date: _______________
VPN: GL.iNet WireGuard (active/inactive)

## Installation

- [ ] `scripts/deploy-tv.sh <TV_IP>` succeeds without errors
- [ ] App appears in TV app list

## Launch

- [ ] App opens without white screen or JS errors (check Tizen Web Inspector console)
- [ ] No console errors visible in `scripts/tv-console-check.sh` output

## Authentication

- [ ] Device code appears in large text (readable from 3 meters)
- [ ] "kino.pub/device" URL is visible
- [ ] Entering code at kino.pub/device activates the app
- [ ] Home screen loads after activation

## Home Rails

- [ ] At least 3 content rails load
- [ ] Poster images display correctly, no blank cards
- [ ] Loading skeleton shows while data loads

## Navigation

- [ ] D-pad Up/Down moves between rails
- [ ] D-pad Left/Right moves within a rail
- [ ] Focus ring clearly visible from 3 meters (couch distance)
- [ ] Sidebar accessible via Left arrow from content area
- [ ] Right arrow from sidebar returns to content area

## Focus Restoration

- [ ] Navigate Home -> select card -> Content page loads
- [ ] Press Back -> returns to Home
- [ ] Focus returns to the same poster card that was previously selected

## Content Detail

- [ ] Select any movie: title, plot, poster, metadata render correctly
- [ ] Select any series: season tabs visible
- [ ] Episode list renders with thumbnails, titles, durations
- [ ] Bookmark toggle button is present and focusable

## Playback (VPN On)

- [ ] Press play on a movie, video starts within 5 seconds
- [ ] No "prepare error" or AVPlay errors
- [ ] Video displays correctly (no artifacts, correct aspect ratio)

## Audio Tracks

- [ ] Open track picker during playback (Up arrow from progress bar)
- [ ] Audio tracks listed correctly
- [ ] Switching audio language changes the audio stream
- [ ] Track picker closes correctly, focus returns to player controls

## Subtitles

- [ ] Enable subtitles from track picker
- [ ] Subtitle text appears at bottom of screen
- [ ] Cyrillic characters render correctly (no garbled text)
- [ ] "Off" option disables subtitles

## Seek

- [ ] Left/Right arrows seek +/-10 seconds
- [ ] Progress bar updates to reflect seek position
- [ ] Seek is responsive (no multi-second delays)

## Playback Sync

- [ ] Watch 2+ minutes of content
- [ ] Exit player (Back button)
- [ ] Re-enter same content and press play
- [ ] Playback resumes near last position (within 30 seconds tolerance)

## Search

- [ ] Navigate to Search via sidebar
- [ ] Samsung on-screen keyboard opens on input focus
- [ ] Type a search query
- [ ] Results appear after typing stops (debounced)
- [ ] Can navigate results and select an item

## Bookmarks

- [ ] Add an item to bookmarks from content detail page
- [ ] Navigate to Bookmarks page via sidebar
- [ ] Bookmark folder appears with item count
- [ ] Enter folder, bookmarked item is visible

## History

- [ ] Navigate to History page via sidebar
- [ ] Recently watched items appear as poster cards
- [ ] Can select an item from history to view details

## Settings

- [ ] Navigate to Settings via sidebar
- [ ] CDN server selection cycles through options (Auto/Netherlands/Russia)
- [ ] Show Clock toggle works
- [ ] Close app and reopen: settings persist
- [ ] Logout button clears session and returns to auth screen

## Error Handling - VPN Drop

- [ ] During playback, disconnect VPN (disable WireGuard on GL.iNet router)
- [ ] Retry overlay appears (not a crash or blank screen)
- [ ] Re-enable VPN
- [ ] Playback resumes after retry

## Error Handling - No VPN

- [ ] With VPN off, attempt to play content
- [ ] NetworkError component shows with retry option
- [ ] No blank screen or app crash

## Long Playback

- [ ] Play a 30+ minute video continuously
- [ ] No memory issues, freezes, or audio desync
- [ ] UI remains responsive after long playback

## App Restart

- [ ] Close app completely (Back on home screen or force close)
- [ ] Reopen app
- [ ] Tokens persist, no re-authentication required
- [ ] Home screen loads directly

## App Exit

- [ ] From home screen with empty navigation stack, press Back
- [ ] App exits cleanly (no hang, no error)

---

## Test Results Summary

Total checks: ___
Passed: ___
Failed: ___
Blocked: ___

### Failures (if any)

| Check | Description | Steps to Reproduce | Expected | Actual |
|-------|------------|-------------------|----------|--------|
| | | | | |

### Notes

