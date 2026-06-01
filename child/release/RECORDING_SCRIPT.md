# Background Location Permission — Recording Script

Target: 45–60 second YouTube **Unlisted** video for Play Console declaration.

---

## Before you press record

### 1. Open four terminal windows (or tabs) ready to use

| Term | Purpose | Command (ready to paste) |
|---|---|---|
| A | Start screen recording | `adb shell screenrecord --time-limit 60 /sdcard/demo.mp4` |
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

### 3. Get a fresh pairing code from your parent app

- Open the Prime Kids Parent app on your phone
- Add a new child (or regenerate the code for an existing child)
- Keep the 6-character code visible so you can read it during recording

### 4. Set a starting location (before recording)

```
adb emu geo fix 106.917693 47.918873
```

This sets the emulator GPS to a point in Ulaanbaatar. You'll move it during recording (see Location mock at the end).

---

## Recording script — every action and what to say

> **Tip**: Tap the action button just *after* finishing the caption/voiceover for that step. Reviewers slow-step through this video — show each screen for at least 2 seconds.

### 0:00 – 0:03 — Splash screen

- **What to do**: Open the Prime Kids child app from the launcher
- **What's on screen**: Splash with "Prime Kids" logo and "Аюулгүй, хамгаалагдсан орчин" subtitle
- **Caption / voiceover (English subtitle suggested)**:
  > *"Prime Kids Child — a parental safety app. Parents install this on their child's phone."*

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

### 0:19 – 0:25 — **Location step — the main shot starts here**

- **What to do**: Tap "Зөвшөөрөл олгох" (Grant permission)
- **What's on screen**: Step 3/5 — "Байршлын мэдээлэл" + the "why" explanation
- **Caption**:
  > *"The app requests location to share with the parent for child safety."*

### 0:25 – 0:32 — **PROMINENT DISCLOSURE — hold here at least 4 seconds**

- **What to do**: **DO NOT TAP YET.** Hold this dialog visible for at least 4 seconds.
- **What's on screen**: AlertDialog titled "Байршлын зөвшөөрөл" with body text explaining:
  > *Prime Kids нь энэ төхөөрөмжийн байршлыг ар талд — апп хаалттай эсвэл ашиглагдаагүй үед ч — цуглуулна…*
  > *("Prime Kids collects this device's location in the background — even when the app is closed or not in use…")*
- **Caption (CRITICAL — this is what the reviewer is looking for)**:
  > *"Before any permission is requested, the app clearly tells the user: location will be collected in the background, even when the app is closed, so the parent can see where the child is. The parent installed this app for safety."*
- **Then**: Tap "Үргэлжлүүлэх" (Continue)

### 0:32 – 0:38 — Foreground location prompt

- **What to do**: On the system dialog, tap **"While using the app"** (or "Only this time")
- **What's on screen**: Android system permission dialog
- **Caption**: *"The OS first asks for foreground location."*

### 0:38 – 0:48 — **Background location prompt — THE CRITICAL FRAME**

- **What to do**: Android opens the Settings page for background location. Tap **"Allow all the time"** (Бүх үед зөвшөөрөх).
- **What's on screen**: Android background-location settings dialog
- **Caption**:
  > *"The user selects 'Allow all the time' — granting background location so the parent app receives updates even when the child app is not active."*
- ⚠️ **Hold the radio selection visible for 2 seconds before navigating away.** The reviewer pauses on this exact frame.

### 0:48 – 0:55 — Proof: location continues in background

- **What to do**:
  1. Tap back/home to leave the child app
  2. Swipe the notification shade down
- **What's on screen**: Foreground service notification — "Prime Kids идэвхтэй / Төхөөрөмжийн хяналт ажиллаж байна" ("Prime Kids active / Device monitoring is running")
- **Caption**:
  > *"Even when the app is not in the foreground, the location service continues to run, transparently visible to the user as a persistent notification."*

### 0:55 – 1:00 — Optional second-device shot

If you also have your phone with the parent app open showing the live location map, hold up the phone next to the screen for the final 5 seconds. Otherwise just end here on the notification shade.

---

## Location mock (run in Terminal D during recording)

These commands fake GPS movement so the location appears to update during the recording.

```
# Starting point (before recording starts) — set ONCE
adb emu geo fix 106.917693 47.918873

# DURING the "background proof" shot (~0:48), move the location:
adb emu geo fix 106.926500 47.911000

# (optional) one more movement at ~0:55
adb emu geo fix 106.935800 47.905200
```

You don't actually see these movements on the child app screen (the child app doesn't show its own location). They matter only if you also record the parent app receiving updates.

---

## After recording — clean post-processing

1. **Pull the video to host**:
   ```
   adb pull /sdcard/demo.mp4 .
   ```
2. **Trim / add captions** in any free editor (Shotcut, DaVinci Resolve, or even YouTube's built-in editor)
3. **Add English subtitle text** at each step listed above — reviewer is almost certainly an English speaker
4. **Upload to YouTube**:
   - Visibility: **Unlisted** (NOT Public, NOT Private)
   - Title: "Prime Kids Child — Background Location Use Justification"
   - Description: paste your "Location access" declaration text from Play Console
5. **Copy the YouTube URL** → paste into the `http://` field in Play Console's location permission declaration

---

## What to do if a step doesn't appear

| Symptom | Fix |
|---|---|
| Splash skips straight to MainActivity (no pairing screen) | `adb shell pm clear com.parenthelper.child` then relaunch |
| Onboarding permissions don't appear after pairing | Force restart: `adb shell am force-stop com.parenthelper.child` then reopen |
| Background location dialog shows the OLD-style buttons ("Allow" / "Deny") instead of "Allow all the time" | Your emulator is < API 30. Use Medium_Phone_API_36.1 (API 36) |
| Mongolian text shows as squares | Emulator missing CJK fonts. Settings → System → Languages → switch to English instead |
