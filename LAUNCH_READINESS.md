# Prime Kids — Launch Readiness & Android→iOS Parity (2026-08-31)

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
| App blocking | 🟡 | Apple model: parent picks apps *on the child device* (PIN-gated FamilyActivityPicker), toggled remotely; no package list |
| Screen-time measurement | 🟡 | 5-min steps first 2 h then 15-min, managed apps only (Apple never exposes raw minutes); parent UI captions it honestly |
| Per-app time limits | 🟡 deferred | possible on iOS via tokens; scheduled post-launch (parent UI hides it for iPhone children) |
| Remote lock/unlock | 🟡 | "Pause/Resume" = shield all apps; iOS forbids screen-locking |
| Online status | 🟡 | new beacon: DeviceActivity events stamp real usage; server pings quiet devices (silent push) every 5 min to collect it; online on any authenticated call; offline thresholds platform-aware |
| Web filtering | 🟡 | Safari content blocker (categories + custom lists) + Apple adult filter; **Safari only** — Android's VPN covers all browsers |
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
1. **Android parent app — BLOCKER**: Play build is pre-auth-fix. vc10 (same code as iOS build 9+) is building on EAS → upload AAB to Play Console → review (~1–3 d).
2. **iOS 1.0.1 (build 7)** in Apple review. Builds 8–10 (map realtime, beacon, batch fixes) staged → fold into **1.0.2** as soon as 1.0.1 resolves.
3. **Server**: `git pull` + restart to activate the pinger job + beacon fields (latest commits `4cef404`+). Index migration from commit `4daee94` notes if not yet run.
4. **Admin panel**: deploy; then write terms (parent+child) and the tutorial YouTube URL in App Settings.
5. **Device test on TestFlight** (child 1.0.1 (10) + parent build 9): pairing→onboarding→shield→pause→SOS→map-live→screen-time climbing→online-while-using.
6. Marketing copy: use `docs/ios-feature-list.md` (updated) — never promise the ❌ rows on iOS.
