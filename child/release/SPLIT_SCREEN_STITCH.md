# Stitching the FOREGROUND_SERVICE_LOCATION split-screen video

You have two clips:

| File | Content | Duration | Resolution | FPS |
|---|---|---|---|---|
| `fgs-parent.mp4` | Parent's LocationScreen — live map with location trail, panned to reveal the route | 16s | 720×1280 | 25 fps |
| `fgs-child.mp4` | Child's MainActivity → notification shade → press home → re-open shade (proves service persists) | 20s | 1080×2400 | 11 fps |

Goal: combine them into one ~20-second side-by-side video for the Play Console FOREGROUND_SERVICE_LOCATION declaration.

## Fastest path — Shotcut (free, ~10 minutes)

Download from https://shotcut.org if you don't have it.

### Setup
1. **File → Open** both clips so they appear in the source viewer
2. **Settings → Video Mode → Custom**:
   - Resolution: **1440 × 1280** (two 720-wide panes side-by-side)
   - Frame rate: **25 fps**
3. **View → Layouts → Editing**

### Build the timeline
1. Drag `fgs-parent.mp4` onto a new video track (V1)
2. Drag `fgs-child.mp4` onto a second video track (V2)
3. On V2 (child clip), open **Filters → + → Size, Position & Rotate**:
   - Size: `720 × 1280`
   - Position X: `720` (offset to the right half)
   - Position Y: `0`
4. On V1 (parent clip), the same filter:
   - Size: `720 × 1280`
   - Position X: `0`
   - Position Y: `0`
5. Both clips now occupy left and right halves of the 1440×1280 frame.

### Sync + trim
- Align both starts at timeline position 0:00
- The parent clip is 16s; the child is 20s. Trim the child to 16s, **OR** speed the parent up slightly to 20s. Recommend the trim: drag the right edge of `fgs-child.mp4` until it matches the parent's end.

### Caption overlay (highly recommended)
Add a **Text: Simple** filter (or "Open Other → Text") with:

> **Left**: "Parent app — live location updates from the foreground service"
> **Right**: "Child app — persistent foreground-service notification (visible even after the app is closed)"

These appear on a separate text track. Keep font small enough not to obscure the map.

### Export
- **File → Export Video → YouTube** preset
- Click **Export File**, save as `fgs-combined.mp4`

## Alternative — YouTube's built-in editor

If you don't want to install software:

1. Upload `fgs-child.mp4` as **Unlisted** to YouTube
2. Upload `fgs-parent.mp4` as **Unlisted** to YouTube
3. In Play Console, paste BOTH URLs in the video field — Play accepts a single URL but you can submit the more demonstrative one (recommend **parent** since the map updates are visually compelling) and add the child clip URL in a comment / description

This is less elegant but skips editing entirely.

## Easiest fallback — single clip (parent only)

If editing time is short, the **parent clip alone** is acceptable for the declaration:

1. Upload `fgs-parent.mp4` to YouTube as Unlisted
2. Add this caption at the start of the video (via YouTube editor's text overlay):
   > "This map is updated continuously by Prime Kids' foreground service on the paired child device. The service displays a persistent notification on the child's phone the entire time it is running, ensuring the child is aware of monitoring."
3. Paste the URL into the Play Console FOREGROUND_SERVICE_LOCATION video field

The reviewer's job is to verify the foreground service is doing the LOCATION task. The parent's live map updating is that proof.

## What the reviewer must see (whichever variant you ship)

- A persistent system notification visible while the foreground service is running ← child clip
- Location data being collected and reported as part of the foreground service ← parent map showing the trail
- The user (child) is "noticeable" of the service running ← notification visibility
- The selected sub-tasks (background location updates + geofencing) match what's shown ← location trail = both

All present in your clips. Time spent: ~10 min stitch in Shotcut OR ~1 min single-clip upload.
