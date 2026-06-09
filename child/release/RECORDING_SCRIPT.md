# Background Location Permission — Recording Script

Target: 60–90 second YouTube **Unlisted** video for Play Console declaration.

Google requires the video to demonstrate **all four elements**:
1. The declared in-app feature's functionality in action
2. How the feature uses location **in the background**
3. How the user triggers the **prominent disclosure** for background location
4. The **device-based runtime permission** (with user consent) displaying to the user

---

## Before you press record

### 1. Open four terminal windows (or tabs) ready to use

| Term | Purpose | Command (ready to paste) |
|---|---|---|
| A | Start screen recording | `adb shell screenrecord --time-limit 90 /sdcard/demo.mp4` |
| B | Stop recording (Ctrl+C in A also works) | (none — Ctrl+C in A) |
| C | Pull video to host | `adb pull /sdcard/demo.mp4 ./demo.mp4` |
| D | Move location during recording | (see "Location mock" below) |

All `adb` commands above assume `adb` is on your PATH. If not, full path:
`C:\Users\friday\AppData\Local\Android\Sdk\platform-tools\adb.exe`

### 2. Pre-recording state — reset the child app to a clean install

```
adb shell pm clear com.parenthelper.child
```

This wipes pairing + permissions so the next launch goes through the full flow.

### 3. Switch the emulator to English locale

Settings → System → Languages → English (United States) as primary. This ensures the system permission dialogs appear in English for Google's reviewers.

### 4. Get a fresh pairing code from your parent app

- Open the Prime Kids Parent app on your phone (or a second emulator)
- Add a new child (or regenerate the code for an existing child)
- Keep the 6-character code visible so you can read it during recording
- **Keep the parent app's Location screen open** — you'll show it later

### 5. Set a starting location (before recording)

```
adb emu geo fix 106.917693 47.918873
```

This sets the emulator GPS to a point in Ulaanbaatar. You'll move it during recording (see Location mock at the end).

### 6. Set up a geofence in the parent app (optional but recommended)

Create a geofence zone ("School") around the starting coordinates so you can show a geofence alert during the demo.

---

## Recording script — every action and what to say

> **Tip**: Tap the action button just *after* finishing the caption/voiceover for that step. Reviewers slow-step through this video — show each screen for at least 2 seconds.

### 0:00 – 0:03 — Splash screen

- **What to do**: Open the Prime Kids child app from the launcher
- **What's on screen**: Splash with "Prime Kids" logo and "Аюулгүй, хамгаалагдсан орчин" subtitle
- **Caption / voiceover**:
  > *"Prime Kids Child — a parental safety app. Parents install this on their child's phone to monitor location and set safe zones."*

### 0:03 – 0:13 — Pairing screen

- **What to do**: Type the 6-char pairing code from your parent app into the boxes → tap "Холбох" (Connect)
- **What's on screen**: Six code boxes + "Холбох" button
- **Caption / voiceover**:
  > *"A parent enters the pairing code from their own app. The child device is now linked to the parent's account."*

### 0:13 – 0:15 — Pairing success → onboarding starts

- **What to do**: Tap "Үргэлжлүүлэх" (Continue)
- **What's on screen**: "Амжилттай холбогдлоо!" (Successfully connected)
- **Caption**: *"Pairing complete. Now we set up the permissions."*

### 0:15 – 0:17 — Skip Usage Stats step quickly

- **What to do**: Tap "Дараа тохируулах" (Skip / set up later) — this isn't the permission we're showing
- **What's on screen**: Step 1/5 — "Апп ашиглалтын мэдээлэл"
- **No caption needed**; this is just a transitional cut. Move fast.

### 0:17 – 0:19 — Skip Device Admin step quickly

- **What to do**: Tap "Дараа тохируулах" (Skip)
- **What's on screen**: Step 2/5 — "Төхөөрөмжийн админ"
- **No caption needed**.

### 0:19 – 0:25 — Location step — the main shot starts here

- **What to do**: Tap "Зөвшөөрөл олгох" (Grant permission)
- **What's on screen**: Step 3/5 — "Байршлын мэдээлэл" + the "why" explanation
- **Caption**:
  > *"Step 3 of 5: Location. The app requests location permission to share the child's location with the parent for safety monitoring and geofence alerts."*

### 0:25 – 0:38 — PROMINENT DISCLOSURE — hold here at least 8 seconds (Google element #3)

- **What to do**: **DO NOT TAP YET.** Hold this dialog visible for at least **8 seconds**. Scroll slowly through the dialog so both the Mongolian and English text are fully visible.
- **What's on screen**: AlertDialog titled "Байршлын зөвшөөрөл / Location Permission" with bilingual body text. The English section reads:

  > *"Prime Kids collects this device's location in the background — even when the app is closed or not in use. This allows the parent to see the child's location and receive alerts when the child enters or leaves a safe zone (home, school). This app was installed by a parent for child safety."*

- **Caption (CRITICAL — this is what the reviewer is looking for)**:
  > *"PROMINENT DISCLOSURE: Before any permission is requested, the app clearly informs the user that location will be collected in the background, even when the app is closed or not in use, so the parent can monitor the child's location and receive geofence alerts. The user must tap 'Continue' to proceed — the dialog cannot be dismissed by tapping outside."*
- **Then**: Tap "Үргэлжлүүлэх" (Continue)

### 0:38 – 0:45 — Foreground location prompt (Google element #4 — part 1)

- **What to do**: On the system dialog, tap **"While using the app"**
- **What's on screen**: Android system permission dialog: "Allow Prime Kids to access this device's location?" with options "While using the app" / "Only this time" / "Don't allow"
- **Caption**: *"The Android system first asks for foreground location permission. The user grants it."*
- ⚠️ Hold the system dialog visible for **3 seconds** before tapping.

### 0:45 – 0:55 — Background location prompt — THE CRITICAL FRAME (Google element #4 — part 2)

- **What to do**: Android opens the Settings page for background location. Tap **"Allow all the time"**.
- **What's on screen**: Android background-location settings dialog with "Allow all the time" option
- **Caption**:
  > *"The Android system then asks separately for background location. The user selects 'Allow all the time' — granting background location so the parent app receives location updates even when the child app is not in the foreground or is closed."*
- ⚠️ **Hold the "Allow all the time" selection visible for 3 seconds before navigating away.** The reviewer pauses on this exact frame.

### 0:55 – 1:03 — Foreground service notification — proof of transparency

- **What to do**:
  1. Tap back/home to leave the child app (or it returns to onboarding — skip remaining steps and go home)
  2. Swipe the notification shade down
- **What's on screen**: Foreground service notification — "Prime Kids идэвхтэй / Төхөөрөмжийн хяналт ажиллаж байна" ("Prime Kids active / Device monitoring is running")
- **Caption**:
  > *"A persistent notification is always visible, transparently informing the user that location monitoring is active in the background."*

### 1:03 – 1:15 — FEATURE IN ACTION: Parent sees live location (Google element #1 & #2)

- **What to do**:
  1. Switch to the parent app (on phone or second emulator) showing the Location screen
  2. Show the map with the child's location pin and trail
  3. **While showing the parent app**, run the location-move command in Terminal D (see below) to show a live location update arriving
- **What's on screen**: Parent app LocationScreen with map, child location marker, polyline trail. Location updates in real-time.
- **Caption**:
  > *"On the parent's phone: the child's live location is visible on the map. The location updates in real-time, even though the child app is minimized and the screen is showing the home screen. This is the core child-safety feature that requires background location."*
- ⚠️ **This is the key shot that proves background location is used.** Make sure the child emulator home screen is visible alongside (or switch between them) to prove the child app is not in the foreground.

### 1:15 – 1:25 — FEATURE IN ACTION: Geofence alert (optional but strongly recommended)

- **What to do**:
  1. Move the child's location outside the geofence zone using Terminal D
  2. Show the push notification arriving on the parent app: "Your child left [zone name]"
- **What's on screen**: Parent app receiving a geofence exit alert
- **Caption**:
  > *"When the child leaves a designated safe zone, the parent receives an instant alert — powered by background location tracking."*

### 1:25 – 1:30 — Closing

- **Caption**:
  > *"Prime Kids uses background location exclusively for child safety: real-time location sharing with parents and geofence alerts. The user is informed via prominent disclosure before granting permission, and a persistent notification is always visible."*

---

## Location mock (run in Terminal D during recording)

These commands fake GPS movement so the location appears to update during the recording.

```
# Starting point (before recording starts) — set ONCE
adb emu geo fix 106.917693 47.918873

# DURING the parent app location demo (~1:03), move the location:
adb emu geo fix 106.926500 47.911000

# Move again to show live tracking (~1:08):
adb emu geo fix 106.930000 47.908000

# (optional) Move OUTSIDE a geofence to trigger alert (~1:15):
adb emu geo fix 106.945000 47.895000
```

---

## After recording — post-processing

1. **Pull the video to host**:
   ```
   adb pull /sdcard/demo.mp4 .
   ```
2. **Trim / add captions** in any free editor (Shotcut, DaVinci Resolve, or even YouTube's built-in editor)
3. **Add English subtitle text** at each step listed above — reviewer is almost certainly an English speaker. **Ensure the prominent disclosure text is readable** — zoom in or highlight the English portion of the dialog if needed.
4. **Add annotations/arrows** pointing to key elements:
   - The prominent disclosure dialog (0:25–0:38)
   - The "Allow all the time" selection (0:45–0:55)
   - The persistent notification (0:55–1:03)
   - The child device being in the background while parent sees location (1:03–1:15)
5. **Upload to YouTube**:
   - Visibility: **Unlisted** (NOT Public, NOT Private)
   - Title: "Prime Kids Child — Background Location Use Justification"
   - Description: paste your "Location access" declaration text from Play Console
6. **Copy the YouTube URL** → paste into the `http://` field in Play Console's location permission declaration

---

## What to do if a step doesn't appear

| Symptom | Fix |
|---|---|
| Splash skips straight to MainActivity (no pairing screen) | `adb shell pm clear com.parenthelper.child` then relaunch |
| Onboarding permissions don't appear after pairing | Force restart: `adb shell am force-stop com.parenthelper.child` then reopen |
| Background location dialog shows the OLD-style buttons ("Allow" / "Deny") instead of "Allow all the time" | Your emulator is < API 30. Use Medium_Phone_API_36.1 (API 36) |
| Mongolian text shows as squares | Emulator missing CJK fonts. Settings → System → Languages → switch to English instead |
| Disclosure dialog text is too small in video | The dialog uses ScrollView + 16sp text. Zoom in during post-processing or use a higher-resolution emulator. |
| Parent app doesn't receive location updates | Check that both devices are connected to the same backend (same API URL). Verify Socket.io connection in parent app logs. |

---

## Checklist before submitting to Play Console

- [ ] Video is 60–90 seconds (max 120 seconds)
- [ ] Prominent disclosure dialog is visible for at least 8 seconds with English text readable
- [ ] Both foreground AND background permission system dialogs are shown separately
- [ ] User taps "Allow all the time" clearly visible
- [ ] Parent app shows live location updates while child app is in background
- [ ] Persistent foreground service notification is visible
- [ ] English captions/subtitles on all screens
- [ ] Video is uploaded as Unlisted on YouTube
- [ ] Declaration form references the correct YouTube URL
