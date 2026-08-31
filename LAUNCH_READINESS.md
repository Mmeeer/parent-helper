# Prime Kids — Launch Readiness & Android→iOS Parity (2026-08-31, rev 2 — pro features)

Verdict up front: **iOS carries every Android feature that Apple's platform permits, plus honest approximations for the rest.** The one launch blocker is on the *Android* side: the Play Store build is three releases old. Details below.

## Parity matrix

✅ full parity · 🟡 works differently by design (Apple platform rules) · ❌ impossible on iOS (no public API — true for every parental app, incl. Qustodio/Bark)

| Feature (Android baseline) | iOS | Notes |
|---|---|---|
| Pairing by code | ✅ | identical backend flow |
| Live location + history + address | ✅ | build 8+: uploads on movement (≥1/min), map polls 15 s, LIVE badge |
| Geofences entry/exit alerts | ✅ | server-side evaluation, platform-independent; timeliness follows location cadence |
| SOS with GPS | ✅ | hold-to-send, parent push |
| Push alerts to parent | ✅ | FCM→APNs; cross-account token bug fixed |
| Daily screen-time limit | ✅ | DeviceActivity threshold → shield |
| Bedtime/school schedules | ✅ | DeviceActivity intervals → shield |
| App blocking | ✅⁺ | **Named blocking groups** ("Games", "Social"…) defined once on the child device, then toggled remotely from the parent app — Android-grade UX |
| Screen-time measurement | 🟡⁺ | dedicated measurement selection (select-all → near-total device figure), 5-min resolution first 2 h |
| Per-app time limits | ✅⁺ | real per-app/group daily limits; when exhausted only those apps shield; **minutes editable remotely** |
| Remote lock/unlock | 🟡⁺ | Pause with duration (15 m/1 h/until tomorrow) + auto-resume, denies app install/removal while paused |
| Online status | 🟡⁺ | "Active now" presence tier (beacon <10 min) in the parent UI + pinger + online-on-any-call |
| Web filtering | 🟡⁺ | categories via Safari blocker; adult filter and new **strict allow-list mode** cover Safari **and most WebKit in-app browsers** |
| Web history | ❌ | no API |
| Installed-apps list | ❌ | no API |
| New-app-install alerts | ❌ | no API |
| Anti-uninstall | ❌ | no API (parents can use Apple's own "Deleting Apps" restriction) |
| Always-on 24/7 service | ❌ | iOS: BG refresh + significant-location wakes + silent pushes + the beacon |
| Bilingual EN/MN | ✅ | both apps |
| Multi-child, subscription keys, reports, alerts, quiet hours, account deletion | ✅ | shared parent codebase |
| **New in this cycle (both platforms)** | | phone-first login, admin-managed terms, tutorial video card, Home brand row, growing subscription bar, permission-state accuracy |

## Verified this session (live)
Backend deployed: identifier & legacy login 200, phone-required register 400/phone-only register 201, /config/app 200, admin settings 401-guarded, subscription `durationDays`+`activatedAt`, push channel to the real child device `viaPush:true`. Parent app: tsc clean, Home/geofence/login screens verified in simulator. Child app: builds clean; dashboard/permission rows verified.

## Launch checklist
1. **Android parent app — BLOCKER**: upload the freshest AAB to Play Console (vc11 building now includes the remote-controls UI; vc10 link available as fallback).
2. **iOS 1.0.1 (build 7)** in Apple review. Builds 8–10 (map realtime, beacon, batch fixes) staged → fold into **1.0.2** as soon as 1.0.1 resolves.
3. **Server**: `git pull` + restart to activate the pinger job + beacon fields (latest commits `4cef404`+). Index migration from commit `4daee94` notes if not yet run.
4. **Admin panel**: deploy; then write terms (parent+child) and the tutorial YouTube URL in App Settings.
5. **Device test on TestFlight** (child 1.0.1 (10) + parent build 9): pairing→onboarding→shield→pause→SOS→map-live→screen-time climbing→online-while-using.
6. Marketing copy: use `docs/ios-feature-list.md` (updated) — never promise the ❌ rows on iOS.
