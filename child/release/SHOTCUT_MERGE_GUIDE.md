# Shotcut merge guide — Prime Kids permission declaration video

You're combining **3 clips** into **1 merged video** with burned-in section titles, then uploading once and reusing the URL for both:
- Play Console → ACCESS_BACKGROUND_LOCATION declaration
- Play Console → FOREGROUND_SERVICE_LOCATION declaration

Source clips (all in `child/release/`):

| Order | File | Length | Section purpose |
|---|---|---|---|
| 1 | `demo-scripted.mp4` | 1:05 | Background location permission flow (prominent disclosure, system prompts, "Allow all the time") |
| 2 | `fgs-parent.mp4` | 0:16 | Parent app's live map updating via foreground service |
| 3 | `fgs-child.mp4` | 0:20 | Persistent foreground-service notification on child device |

Final video: **~1:41**.

---

## Step 0 — Install Shotcut

If you don't have it: https://shotcut.org/download/ (free, ~150MB).

## Step 1 — Create the project

1. Launch Shotcut
2. **Settings → Video Mode → HD 1080p 30fps** (Shotcut will scale 720p clips up automatically)
3. **File → Open Other → empty timeline** (or just close any "Open File" dialog)
4. **View → Layouts → Editing**

## Step 2 — Import all 3 clips

1. **File → Open File** → select all three .mp4 files (Ctrl-click each) from `child/release/`
2. Or drag-drop them from the file explorer into Shotcut's "Source" / "Playlist" panel
3. Confirm all three appear in the "Recent" / "Source" list

## Step 3 — Build the timeline (V1 track)

1. If there's no timeline yet, **right-click the timeline panel → Add Video Track**
2. Drag clips onto V1 **in this exact order**:
   - Position 0:00 — `demo-scripted.mp4`
   - Position 1:05 — `fgs-parent.mp4` (drops right after the first clip ends)
   - Position 1:21 — `fgs-child.mp4`
3. The timeline should now show three clips back-to-back, total ~1:41.

## Step 4 — Add burned-in section title for clip 1

1. Click `demo-scripted.mp4` on the timeline to select it
2. Open the **Filters** panel (right side) → click the **+** button
3. Pick **"Text: Simple"** from the list
4. In the filter settings:
   - **Text** field, paste:
     ```
     Section 1 of 3
     Background location permission flow
     Prominent disclosure → "Allow all the time"
     ```
   - **Position**: top center (or bottom — pick whichever doesn't cover important content)
   - **Font**: Roboto Bold, size ~36
   - **Foreground color**: white
   - **Background color**: black at 80% opacity (so text is readable over any frame)
5. **Make the title appear only for the first 4 seconds** of the clip:
   - Below the filter settings find **In:** and **Out:** time controls
   - Set **In:** to 00:00:00.000
   - Set **Out:** to 00:00:04.000
   - This makes the text only visible during the first 4 seconds, then disappears

> **If "In/Out" filter timing isn't visible**, look for a "Keyframes" tab on the filter. Or skip the timing and have the text overlay the entire clip — slightly more cluttered but always works.

## Step 5 — Add burned-in section title for clip 2

1. Click `fgs-parent.mp4` on the timeline
2. **Filters → + → Text: Simple**
3. **Text**:
   ```
   Section 2 of 3
   Parent app — live location updates
   Map trail comes from the child's foreground service
   ```
4. Same font + colors as Section 1
5. **In: 0:00.000  Out: 0:04.000** (first 4 sec of the 16-sec clip)

## Step 6 — Add burned-in section title for clip 3

1. Click `fgs-child.mp4` on the timeline
2. **Filters → + → Text: Simple**
3. **Text**:
   ```
   Section 3 of 3
   Persistent foreground notification on child device
   Visible to the child even when the app is closed
   ```
4. Same styling
5. **In: 0:00.000  Out: 0:05.000** (first 5 sec of the 20-sec clip)

## Step 7 — (Optional) Add a transparent watermark across the whole video

Reviewers like seeing context. On V1, add a low-opacity text in the bottom-right that says "Prime Kids • Permission demo" for the entire timeline. Use Filters → Text: Simple with no In/Out limits and opacity ~50%.

## Step 8 — Export

1. **File → Export Video**
2. Select preset: **YouTube** (1080p H.264 mp4)
3. Click **Export File** at the bottom
4. Save as `combined-permission-demo.mp4` in `child/release/`
5. Wait for export (Shotcut shows progress in "Jobs" panel; typical export of 1:41 takes 2-5 min on this machine)

## Step 9 — Upload to YouTube

1. youtube.com/upload
2. Drop the exported `combined-permission-demo.mp4`
3. **Title**: `Prime Kids Child — Background location + Foreground service location permission demo`
4. **Description**: (optional but helps)
   ```
   Demonstration video for Google Play declarations:
   - ACCESS_BACKGROUND_LOCATION
   - FOREGROUND_SERVICE_LOCATION (background location updates + geofencing)

   The Prime Kids Child app is a parental control app installed by a parent on
   their child's Android device. After pairing with the Prime Kids Parent app,
   the child app reports the child's location to the paired parent's account
   using a foreground service. The persistent notification on the child device
   provides transparency to the user that monitoring is active.

   Section 1: Permission grant flow — prominent disclosure and "Allow all the
   time" selection (0:00-1:05)
   Section 2: Parent receives location updates in real time (1:05-1:21)
   Section 3: Persistent foreground service notification on the child device,
   visible even when the app is closed (1:21-1:41)
   ```
5. **Visibility: Unlisted** (not Public, not Private — Unlisted)
6. **Audience**: "No, it's not made for kids" (important — this is for review, not kids)
7. Publish → wait for processing (1-3 min)
8. Copy the URL from the address bar

## Step 10 — Paste URL into Play Console

Same URL in **both** fields:

1. Play Console → your child app → **App content → Sensitive app permissions → Location** → Video URL field → paste
2. Play Console → your child app → **App content → Foreground service permissions → FOREGROUND_SERVICE_LOCATION** → Video URL field → paste

Save both. The reviewer evaluates each declaration against the same video; they jump to the relevant section based on the timestamp.

---

## Quick troubleshooting

| Problem | Fix |
|---|---|
| Clips have different resolutions, video looks letterboxed | On the smaller-resolution clip (fgs-parent.mp4 is 720×1280), add **Size, Position & Rotate** filter, set size to 1080×1920, position centered. Bottom shows black bar — that's fine. |
| Text overlay covers important UI | Move "Position" of the Text filter to bottom-third instead of top |
| Export takes forever | Reduce preset to **YouTube 720p** instead of 1080p. Recording at 720 is fine for review |
| Audio? | None of the source clips have audio. The video is silent. That's fine for permission demos; reviewers don't expect narration. |

Once exported and uploaded, you're done with the recording phase for both declarations. The other declarations (QUERY_ALL_PACKAGES, SYSTEM_ALERT_WINDOW, etc.) need their own videos — different scope.
