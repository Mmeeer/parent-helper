# Prime Kids — Full System Evaluation (2026-08-20)

Method: live production API sweep (31 checks as the demo account, read-only/reversible), full parent-app UI walkthrough on the iOS simulator against live data (15 screens), child-app screen audit, code inspection. Real-device signals came from the owner's paired iPhone 15 Pro (build 2).

## Verdict at a glance

| Layer | Health | Notes |
|---|---|---|
| Backend API (prod) | ✅ 31/31 checks pass | 0 errors, no 5xx, no leaks; steady-state latency 0.3–0.9 s; only cold `/auth/login` hit 2.2 s (bcrypt) |
| Realtime & push | ✅ | Socket.IO handshake OK; **`viaPush: true`** — child iPhone registered its FCM token (build-2 fix confirmed working); commands also queue for poll fallback |
| Parent app (iOS) | ✅ with fixes below | All 15 screens render live data; MN/EN both work |
| Child app (iOS) | ✅ on device | Paired, heartbeating (battery reported), GPS syncing, app selection uploaded (6 apps · 6 categories), Screen Time authorised |
| Android apps | ⚠️ not re-tested | In production on Play; parent vc9 AAB (auth fix) still awaiting Play upload |
| Admin panel | ⚠️ not tested | No admin credentials in scope |

## Feature-by-feature (parent's view)

| Feature | Works? | Easy to find? | Notes |
|---|---|---|---|
| Register / login / logout | ✅ | ✅ login screen | Phone now optional; MN default + МН/EN toggle |
| Dashboard (children, plan, alerts) | ✅ | ✅ home tab | |
| Live location + history + address | ✅ real GPS today | ✅ child → Байршил харах | |
| Geofences (create/toggle/delete) | ✅ (tested create+delete) | ✅ child → Геофенс | |
| Alerts (SOS, offline, blocked…) | ✅ | ✅ tab with badge | see K1 below (English messages) |
| Reports (day/week/month) | ✅ | ✅ child → Тайлан | iOS note added (was unexplained zeros) |
| Screen-time limit + schedules | ✅ round-trip verified | ✅ child → Дэлгэцийн цаг | iOS info card present |
| App blocking (iOS selection model) | ✅ end-to-end | ✅ child → Аппын удирдлага | Shows "6 апп · 6 ангилал" from the real phone |
| Web filter categories + custom lists | ✅ | ✅ child → Вэб шүүлт | Safari-only banner for iOS |
| Remote: Pause / Resume / Locate / Sync | ✅ via push (real-time) + queue | ✅ child → Төхөөрөмж | iOS wording + hint correct |
| Pair / replace / unpair device | ✅ | ✅ Devices screen | |
| Subscription view + key activation | ✅ | ✅ Settings → Захиалга | **fixed:** raw `{{count}}` showed on screen |
| Notification settings + quiet hours | ✅ | ✅ Settings | |
| Account deletion / password / profile | ✅ | ✅ Settings | 30-day grace, auto-purge job |
| Privacy policy & terms | ✅ MN in-app + hosted EN | ✅ Settings | |

Child app (on-device): pairing ✅, onboarding (notif/location/Screen Time/Safari) ✅, dashboard + SOS ✅ (alert arrived), parent-PIN app picker ✅, shields/pause ✅ (Screen Time authorised), Safari filter ✅ after manual enable, unpair ✅. Known papercut: iOS cannot deep-link to Safari extension settings — onboarding copy now spells out the path (build 2).

## Issues found & fixed in this evaluation (commit ae6d0c7)
1. **Subscription screen showed literal `{{count}}`** ("362 {{count}} өдөр") — i18n interpolation never received the value. User-visible to reviewers. Fixed + MN spacing.
2. **Offline flapping / alert spam** — 5-min offline threshold vs iOS's ~15-min-plus opportunistic heartbeats → every iOS device cycled offline/online and generated "went offline" alerts (6+ in the demo account in one day). Fixed: platform-aware thresholds (iOS 60 min, Android 20 min), `join:device` socket now marks the device online instantly, and the child app heartbeats on every foreground. **Needs server deploy.**
3. **Reports screen looked broken for iOS children** (all-zero charts, no explanation) — added an explanatory iOS note (EN+MN).

## Known issues, deliberately not fixed now
- **K1 — Alert messages are English** even in MN UI ("SOS alert from Saraa!"): messages are composed server-side in English. Proper fix = type-based client-side localization or backend i18n. Moderate polish item for 1.1.
- **K2 — Review submission runs on child build 1** (no FCM self-heal): fine while reviewers test with the app foregrounded (socket path); build 2 is on TestFlight and becomes the attached build on any resubmission.
- **K3 — Android parent app vc9** (token-refresh fix) built but not yet uploaded to Play.
- **K4 — Admin panel** untested end-to-end.
- **K5 — iOS background delivery limits** (platform behavior, documented): force-quitting the child app suspends silent pushes until next open; queue guarantees eventual delivery.

## Deploy checklist to activate today's fixes
1. Server: `git pull && restart parent-helper-api` (offline thresholds + socket-online fix).
2. Parent app: fixes ride along in the next build (no store impact now; reviewers use build 5 which shows the `{{count}}` bug only on the Subscription screen — acceptable, or mention nothing).
3. Child app: build 2 already on TestFlight with its fixes.
