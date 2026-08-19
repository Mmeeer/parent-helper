# Prime Kids: Child — Release Readiness Checklist (iOS 1.0)

App Store Connect ID **6802229430** · bundle `com.parenthelper.child` · build **1.0.0 (1)** uploaded 2026-08-19.
Tick every box; when sections 1–4 are complete, press **Add for Review → Submit** in App Store Connect (parent app should be submitted first).

---

## 1. App Store Connect listing (browser)
- [x] Build 1.0.0 (1) processed and attached to version 1.0
- [x] Family Controls (Distribution) enabled on `com.parenthelper.child` + DeviceActivityMonitor / ShieldConfiguration / ShieldAction App IDs
- [x] Categories: Utilities / Lifestyle · Content rights: no third-party content
- [x] Age Rating: 4+ (Parental Controls = Yes; everything else None/No; Made for Kids = No)
- [x] Subtitle, Promotional text, Description, Keywords, Support/Marketing URL, Copyright
- [x] 5 iPhone screenshots uploaded (pairing, onboarding-location, dashboard, settings, parent settings)
- [x] App Privacy published (Precise Location, Device ID, Product Interaction linked; Crash/Performance not linked; no tracking)
- [x] Pricing: Free · Availability: Mongolia only · Version Release: Manual
- [ ] App Review Information → Notes: `[PASSWORD]` replaced by `ReviewTest2026!`; contact name/phone/email filled; `PRIME888` present
- [ ] (Optional, recommended) attach a 60–90 s screen recording of steps 2.2–2.7 below to App Review Information
- [ ] Reload 1.0 page → zero warnings, "Add for Review" enabled

## 2. On-device test via TestFlight (iPhone; Family Sharing child account preferred)
- [ ] 2.1 TestFlight: install **Prime Kids: Child (1)** and **Parent Helper (5)**; both launch; child app language follows the phone
- [ ] 2.2 Pair with **PRIME888** → "Device Protected" dashboard
- [ ] 2.3 Onboarding: Notifications allowed → Location allowed (**Always** if offered) → **Screen Time authorised** → Safari extension enabled in Settings → Safari → Extensions → Finish; dashboard rows show Active
- [ ] 2.4 ⚙ → Parent settings → create PIN → **Manage apps & categories** → pick 2–3 apps → "Saved to the parent app"
- [ ] 2.5 Parent app → child → App Rules → **Block selected apps** ON → Save; parent shows "N apps · M categories selected"
- [ ] 2.6 Child phone: open a picked app → **Prime Kids shield** appears (Close / Ask parent). "Ask parent" → parent app receives an alert (may arrive at next sync)
- [ ] 2.7 Parent app → Devices → **Pause** → all apps shielded on child ("Device paused"); **Resume** clears (≤ 30 s when child app is backgrounded)
- [ ] 2.8 Parent app → Location shows the child; Devices → **Locate** refreshes the point
- [ ] 2.9 Child app: hold **SOS** 2 s → parent receives SOS alert (push + in-app)
- [ ] 2.10 Schedules: in parent app set a bedtime schedule starting in a few minutes → shield appears at start, clears at end
- [ ] 2.11 Daily limit: set a small limit (e.g. 5 min) → after usage the shield "Daily limit reached" appears
- [ ] 2.12 Safari: add a domain to the web-filter block list in the parent app → child Safari blocks it (Content Blocker enabled)
- [ ] 2.13 Background: kill the child app, wait 5–10 min → parent still shows online / last seen updates (heartbeat is iOS best-effort)
- [ ] 2.14 Unpair from the parent app → child returns to the pairing screen; shields cleared
- [ ] 2.15 Re-pair, then Parent settings → Unpair this device (PIN) → same result
- [ ] 2.16 No crashes / hangs during 2.1–2.15; child app Settings → Legal links open

## 3. Fix loop (if anything in section 2 fails)
- [ ] Describe the failing step (+ screenshot/recording) → fix in code
- [ ] Bump `CURRENT_PROJECT_VERSION` in `child-ios/Config/Shared.xcconfig` (2, 3, …)
- [ ] `child-ios/scripts/release.sh` → new build lands in TestFlight → re-test the failed step
- [ ] Attach the new build to version 1.0 in App Store Connect

## 4. Final go / no-go
- [ ] Sections 1 and 2.2–2.7 complete (2.8–2.16 strongly recommended)
- [ ] Parent app already submitted (or submitting together)
- [ ] Reviewer notes accurate for the shipped build (Mongolian default, PRIME888, Screen Time caveat)
- [ ] **Add for Review → Submit** (owner clicks)

## 5. After submission
- [ ] Watch App Store Connect / email for reviewer questions; typical asks: Family Controls demo video, why Always-location, how the parent authorises Screen Time
- [ ] On approval: release manually (both apps together), then follow `REVIEW.md` to disable `REVIEW_ACCOUNT_EMAIL` / `REVIEW_DEMO_PAIRING_CODE` on the server (or leave; inert once removed)
- [ ] Post-launch: monitor crash logs in Xcode Organizer / TestFlight feedback; plan 1.1 (per-app limits, MN store text if Apple adds Mongolian)
