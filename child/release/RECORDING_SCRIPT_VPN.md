# VpnService Declaration — Recording Script

Target: 60–90 second YouTube **Unlisted** video for Play Console's VpnService Declaration Form.

Google wants the video to make these three things obvious:

1. The VPN is being used (consent granted, packets actually flowing through it).
2. Its **core purpose** is parental web filtering (not a general-purpose VPN).
3. It **filters** traffic locally — does not tunnel traffic to a remote server.

---

## Two ways to capture this

| Path | When to use | Effort |
|---|---|---|
| **A. Automated** via [record_vpn_filter.py](record_vpn_filter.py) | Emulator-5554 is up, child app is paired, web filter has a known blocked domain | 1 command |
| **B. Manual** with `adb screenrecord` + tap actions yourself | Anything else (physical device, different package, off-the-cuff demo) | Follow the timeline below |

The automated path is preferred — it produces a consistent take every time, identical pacing to the location video, no missed beats.

---

## Path A — automated recording

### One-time setup (do these once on the emulator)

1. **Install the latest child AAB** so the manifest/disclosure/UI matches what Play will see:
   ```
   adb install -r ..\release\prime-kids-child-v1.0.2-vc5.aab
   ```
   (or whatever the newest vc is)
2. **Pair the app and grant all onboarding permissions** — easiest way is to run the location recorder once:
   ```
   python record_demo.py <PAIRING_CODE>
   ```
   At the end of that run, the child app is paired, location is granted, and it has reached `MainActivity`. The VPN consent dialog will have been **dismissed** during that run, so revoke it before recording the VPN video:

   ```
   adb shell am start -a android.settings.VPN_SETTINGS
   ```

   Tap **Prime Kids → Forget VPN**. Then `adb shell input keyevent KEYCODE_HOME`.

3. **Configure a blocked category on the parent app** so the child's `DomainBlockList` has something to block. Easiest: enable the "Adult" category, OR add a custom domain (e.g., `example-blocked.com`) on the parent app's Web Filter screen for this child. Wait ~10 seconds for the socket sync to land on the child.

4. **Verify the blocked domain is actually in the device's blocklist** before recording:
   ```
   adb logcat -d | findstr "DomainBlockList"
   ```
   You should see a line like `Synced N domains for categories: [adult]`. If N is 0 or the line is missing, the parent's filter sync hasn't reached the child yet — wait and check again.

### Run the recording

```
cd child\release
python record_vpn_filter.py <BLOCKED_DOMAIN> <ALLOWED_DOMAIN>
```

Example:
```
python record_vpn_filter.py example-blocked.com wikipedia.org
```

The script:

1. Starts `screenrecord` at 8 Mbit/s, 90-second cap.
2. Launches `MainActivity`, which triggers `requestVpnConsent()`.
3. Holds the prominent disclosure dialog visible for **6 seconds**, then taps "I Understand".
4. Taps OK on the Android VPN consent system dialog.
5. Drops to the home screen and pulls down the notification shade to show the running Prime Kids monitoring + VPN notifications.
6. Opens Chrome at `https://<BLOCKED_DOMAIN>/` → page fails to load (NXDOMAIN).
7. Holds the error visible for 5 seconds.
8. Opens Chrome at `https://<ALLOWED_DOMAIN>/` → page loads normally.
9. Holds the loaded page visible for 5 seconds.
10. Stops the recording and pulls `vpn-filter-scripted.mp4` to `child/release/`.

### Post-process

1. **Add captions** in any free editor (YouTube Studio's caption editor works, or Shotcut):
   - 0:00 *"Prime Kids — parental control. When the parent enables web filtering, the child app starts a local on-device VPN to enforce it."*
   - 0:04 *"PROMINENT DISCLOSURE: before the system VPN prompt, the app explains exactly what the VPN does — local DNS filtering, no traffic sent to external servers."*
   - 0:10 *"User taps 'I Understand'."*
   - 0:13 *"Android then shows its own VPN consent prompt; the user accepts."*
   - 0:20 *"Persistent notifications confirm the monitoring service and the web filter are running."*
   - 0:35 *"Child tries a parent-blocked site — the DNS request is rejected locally, the page does not load."*
   - 0:55 *"Same browser, same VPN, an allowed site — loads normally. Allowed traffic goes to public DNS (8.8.8.8) on-device."*
   - 1:15 *"The VPN is for parental web content filtering only. No traffic is tunneled to any remote server."*

2. **Upload to YouTube → Unlisted**.
3. Paste the URL into the VpnService Declaration Form video field. Description should be exactly the answer text you submitted on the form ("Local on-device VPN used solely for parental web content filtering …").

---

## Path B — manual capture (no automation)

If the emulator isn't cooperating, you can do it by hand. Same shot list:

| Time | What to show | What to do |
|---|---|---|
| 0:00–0:04 | Opening the child app from launcher | Tap launcher icon |
| 0:04–0:10 | Prominent disclosure ("Web Content Filter") | Hold dialog visible 6 s |
| 0:10–0:13 | User taps "I Understand" | Tap |
| 0:13–0:20 | Android system VPN consent prompt | Tap OK; hold 3 s |
| 0:20–0:30 | Notification shade — VPN + monitoring notifications | Swipe down, hold 5 s |
| 0:30–0:35 | Open Chrome | Tap Chrome icon, address bar |
| 0:35–0:55 | Type a blocked domain → page fails | Type URL, press enter, hold error 5 s |
| 0:55–1:15 | Type `wikipedia.org` → page loads | Type URL, press enter, hold loaded page 5 s |
| 1:15–1:25 | Closing card or return-home | Home key |

Capture commands:

```
# Reset
adb shell input keyevent KEYCODE_HOME

# Make sure VPN consent isn't already granted
adb shell am start -a android.settings.VPN_SETTINGS    # Forget VPN, then back

# Start recording
adb shell screenrecord --time-limit 90 --bit-rate 8000000 /sdcard/vpn-demo.mp4

# After you're done (Ctrl+C the screenrecord, OR it times out at 90 s)
adb pull /sdcard/vpn-demo.mp4 vpn-filter-manual.mp4
```

---

## Common failure modes

| Symptom | Fix |
|---|---|
| Prominent disclosure dialog doesn't appear when `MainActivity` opens | VPN consent was already granted in a prior run. `adb shell am start -a android.settings.VPN_SETTINGS` → Forget VPN, then re-run |
| Chrome says "DNS_PROBE_FINISHED_NXDOMAIN" for both blocked and allowed sites | The VPN is on but DNS isn't routing. Check that the foreground service started — the recorder logs `[5] System VPN consent: OK` should be present |
| Blocked domain actually loads | The parent's blocklist hasn't synced. Check `adb logcat -d \| findstr DomainBlockList` for the sync message; check the parent app's Web Filter screen has the category/domain enabled for this child |
| Wikipedia doesn't load | DNS forwarder is failing. Inspect `adb logcat -d \| findstr WebFilterVpn` |
| Chrome can't be opened by URL intent | Use `adb shell monkey -p com.android.chrome -c android.intent.category.LAUNCHER 1` instead, then type the URL by hand |
| Notifications don't appear in the shade | The foreground service didn't start. `adb shell am start -n com.parenthelper.child/.ui.main.MainActivity` to retrigger |
| Whole screen is black for the first 1–2 seconds | `screenrecord` always has a small startup lag; trim the head in post |

---

## Checklist before submitting to Play

- [ ] Video is ≤ 90 seconds
- [ ] Prominent disclosure dialog is visible ≥ 5 seconds with the English text readable
- [ ] System VPN consent system dialog is visible
- [ ] Blocked-domain failure page is visible ≥ 4 seconds
- [ ] Allowed-domain success page (e.g. Wikipedia) is visible ≥ 4 seconds
- [ ] English captions/subtitles explain "local on-device DNS filter, no remote tunnel"
- [ ] Uploaded as **Unlisted** on YouTube
- [ ] URL pasted into the VpnService Declaration Form
- [ ] Data safety form already declares "Web browsing history" → linked to user / not for tracking / app functionality
