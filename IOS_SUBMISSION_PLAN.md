# iOS Submission Plan — Prime Kids (Parent + Child)

**Date:** 2026-08-17 · **Status:** Android parent + child both approved on Google Play. iOS not started beyond source drafts.
**Companion docs:** [IOS_BUILD.md](IOS_BUILD.md) (original roadmap), [PUBLISHING.md](PUBLISHING.md) (Play), [REVIEW.md](REVIEW.md) (reviewer account), `child-ios/*.md` (draft store docs).

This plan is the result of a full audit of `child-ios/`, `parent-app/`, `backend/` and `child/` (Android) on this Mac (Xcode 26.2, macOS 15.6.1).
It is organised in the order you asked for:

1. **Child-iOS app — missing features & dev work** (Phases 1–3)
2. **Apple developer requirements & review compliance** (Phase 4 + 5)
3. **Store-front assets & submission** (Phase 6 + 7)

---

## 0. Where we actually are (audit summary)

| Area | State | Verdict |
|---|---|---|
| **child-ios** | 21 Swift files / ~1.8k LOC + 6 draft docs. **No `.xcodeproj` — it has never been compiled.** Working: pairing (code entry), API client, Keychain token, location (fg/bg/significant), heartbeat + BGTasks, SOS, APNs receive path, rules fetch/cache, dashboard. **Stubbed/absent:** all Screen Time enforcement (app blocking is a `print`), no DeviceActivityMonitor / ShieldConfiguration / ShieldAction extensions, no FamilyActivityPicker, Safari content blocker never fed, no localization, no settings/privacy screen, no unpair, wrong default server URL, ~10 correctness bugs (Appendix A). | **~40 % of an MVP** |
| **parent-app (Expo SDK 53)** | Bundle ID + `GoogleService-Info.plist` present. **Missing:** `ios.infoPlist` (incl. `ITSAppUsesNonExemptEncryption`), `eas.json` iOS build/submit profiles, iOS push token path is broken (raw APNs token sent to FCM → silently dropped), no `platform === 'ios'` gating of Android-only child features, iPad screenshots required (`supportsTablet: true`). Account deletion ✅, in-app privacy screen ✅. | **~1 week** |
| **backend** | `platform` stored but never used. Push = FCM only, parent-direction only. **No command transport usable by iOS** (lock/locate/sync/rules-updated are Socket.IO-only). `Rule.blockedApps` / `perApp.appId` / `installedApps` are Android package-name shaped. `POST /auth/fcm-token` needs parent JWT (child can't call it). SOS push uses `interruption-level: critical` (needs Apple entitlement). Reviewer account + `PRIME888` ✅. | **~1 week** |
| **Store assets** | Android screenshots only (1080×2400). Icons 1024² ✅. Draft child-iOS metadata/privacy/review-notes docs exist but **describe features the code doesn't have** (QR pairing, DeviceActivityReport, uninstall protection, browsing history). No parent-app iOS metadata at all. Two conflicting bundle IDs / App Group IDs / privacy URLs across docs. | **~1 week, parallel** |
| **Apple account** | Unknown — verify Developer Program enrollment, App IDs, Family Controls entitlement request status. | **Day 1** |

**Realistic timeline:** ~7–8 weeks to submit both apps with one iOS dev + one backend/RN dev working in parallel. Parent app can go to TestFlight in week 2 and be *submitted* in week 3 (it does not depend on the child app), but see Decision 1.

---

## 1. Decisions needed before coding (answer these first)

> **Decided 2026-08-17:** D1 = **keep key-only activation** (owner's call; 3.1.1 risk accepted — mitigations: no purchase links/prices/QR anywhere in the iOS app, copy says keys are issued by the administrator, reviewer account is pre-activated). D2 = **`com.parenthelper.child`** (applied to `child-ios/`). D5 = live `primekids.masterclass.mn/parent-helper/legal/*.html` URLs, support page `/parent-helper/support.html`, contact `ub1o1genko@gmail.com` (applied). D3/D4 = recommendations accepted by default.

| # | Decision | Recommendation |
|---|---|---|
| **D1 — Subscription vs. Apple IAP (Guideline 3.1.1)** | Parent app unlocks paid functionality with a `PK-XXXX-XXXX` key "provided by the administrator", and pairing is gated on an active subscription. Apple rejects apps that unlock consumer features via keys bought outside the app unless the same subscription is *also* offered as IAP (3.1.3(b)). | **Recommended:** add an auto-renewable subscription via StoreKit 2 (`react-native-iap` or `expo-iap`) in the parent app + backend App Store Server Notifications v2 → creates the same `Subscription` record the key flow creates. Keep key redemption (allowed once IAP exists). Budget ~1.5 weeks. **Fallback for v1:** hide the "Activate Key" screen on iOS and grant iOS accounts a free tier server-side (no gate) — faster, but no iOS revenue and Apple may still ask how one subscribes. |
| **D2 — Bundle ID / App Group naming** | Code uses `com.primekids.child` + `group.com.primekids.child`; `IOS_BUILD.md` and Android use `com.parenthelper.child`; parent iOS is `com.parenthelper.parent`. | Use **`com.parenthelper.child`** + `group.com.parenthelper.child` for consistency with Android + parent (10-min find/replace, do it before creating App IDs). If App IDs were already registered under `com.primekids.*`, keep those instead. |
| **D3 — v1 scope of iOS Screen Time** | Full parity is impossible on iOS. Options: (a) v1 = location/geofence/SOS/Safari filter only, Screen Time later; (b) v1 includes bedtime/schedule shields, daily limit, block selected apps, remote "pause". | **(b)** — the Family Controls entitlement request must describe real usage, and "parental control" without any Screen Time enforcement is a weak App Store story. Scope in §3 is sized for (b). |
| **D4 — Command transport for iOS child** | iOS cannot hold the Socket.IO connection in background. | Add **Firebase Messaging SPM** to child-ios (FCM token → existing `sendEachForMulticast`), backend gets `Device.fcmToken` + `sendCommandToDevice()` silent push; REST poll on BGAppRefresh as fallback; keep WebSocket while foregrounded. |
| **D5 — Canonical URLs** | Docs use `parenthelper.com/legal/…` (child-ios) and `primekids.masterclass.mn/parent-helper/legal/privacy-policy` (Play, live). | Use the **live** `https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html` (+ `terms-of-service.html`, `coppa.html`) everywhere. Support email: replace the personal Gmail in `PrivacyPolicyScreen.tsx` with a support@ address that is actually monitored. |

---

## 2. Phase 0 — Apple accounts & prerequisites (Day 1–2, blocking)

- [ ] **Apple Developer Program** — confirm enrolment (Organization preferred; needs D-U-N-S). Sign in to Xcode → Settings → Accounts.
- [ ] **App IDs** (developer.apple.com → Identifiers):
  - `com.parenthelper.parent` — Push Notifications.
  - `com.parenthelper.child` — Push Notifications, App Groups, **Family Controls**, Background Modes.
  - `com.parenthelper.child.ContentBlocker`, `.DeviceActivityMonitor`, `.ShieldConfiguration`, `.ShieldAction` — App Groups (+ Family Controls on the extensions that use it).
  - App Group `group.com.parenthelper.child`.
- [ ] **Family Controls (Distribution) entitlement request** — file **today**: https://developer.apple.com/contact/request/family-controls-distribution/. Takes 2–4+ weeks; the *development* entitlement works on device without approval. Narrative: use `child-ios/FamilyControlsEntitlement.md` **after** trimming it to what v1 really does (see §5.3). Attach Play listing links + Android screenshots.
- [ ] **APNs Auth Key** (.p8) → upload to Firebase project `prime-kids` (Cloud Messaging → APNs). Same key serves both apps.
- [ ] Register an **iOS app for the child** in Firebase (`com.parenthelper.child`) → download `GoogleService-Info.plist` for child-ios (D4). Confirm the parent's existing plist matches `com.parenthelper.parent`.
- [ ] **App Store Connect** → create both app records (names below), SKU, primary language English (US), add Mongolian localization later.
- [ ] Test hardware: at least one iPhone on iOS 16+ (Family Controls does **not** work in Simulator) — ideally two (parent + child) plus a child Apple ID in a Family Sharing group.
- [ ] Reviewer account: re-run `backend/scripts/seed-review-account.js`; keep `REVIEW_ACCOUNT_EMAIL` / `REVIEW_DEMO_PAIRING_CODE=PRIME888` set in prod during review.

---

## 3. Phase 1–3 — Child-iOS app: from source dump to submittable build

### Phase 1 — Make it build (Week 1)

> **Progress 2026-08-17:** `child-ios/project.yml` (XcodeGen) → `PrimeKidsChild.xcodeproj` with 5 targets; D2 rename; Info.plist/entitlements/privacy manifests rewritten; Firebase Messaging via SPM + `GoogleService-Info.plist`; App-Group `UserDefaults` + shared Keychain group; Socket.IO client rewritten (proper handshake, `command` payload, backoff); `CommandHandler` (sync/locate/lock→pause/unlock/unpair/rules:updated); `ScreenTimeManager` now shields from an on-device `FamilyActivitySelection`, remote pause, Apple adult filter, DeviceActivity schedules + daily-limit threshold; DeviceActivityMonitor / ShieldConfiguration / ShieldAction extensions written (bilingual shield copy); ContentBlocker fixed and wired to rule refresh; Appendix-A bugs fixed. All targets **type-check clean** against the iOS 26 SDK; full `xcodebuild` pending the iOS platform download on this Mac. Backend **B1** (`POST /devices/push-token`, `Device.pushToken`) and **B2** (`sendDeviceCommand` silent push on command / rules:updated / unpair) implemented. Parent `app.json` iOS block + notification handler done (5.1 partial).

- [ ] **Create the Xcode project** in `child-ios/PrimeKidsChild.xcodeproj` (SwiftUI, iOS 16.0, Swift 5.9+). Add existing folders as groups; delete `Package.swift` (it declares a library, not an app).
- [ ] Targets: `PrimeKidsChild` (app), `ContentBlocker` (Safari Content Blocker Extension), `DeviceActivityMonitorExtension`, `ShieldConfigurationExtension`, `ShieldActionExtension`. All extensions in the App Group.
- [ ] Capabilities on app target: Family Controls, App Groups, Push Notifications, Background Modes (location, fetch, processing, remote-notification), Time Sensitive Notifications.
- [ ] Apply D2 rename (bundle IDs, App Group, Keychain service, BGTask identifiers, URL scheme).
- [ ] Fix `Info.plist`: remove `armv7` from `UIRequiredDeviceCapabilities` (upload rejection), remove `NSUserTrackingUsageDescription` (implies ATT tracking — we don't track), add `NSLocationAlwaysAndWhenInUseUsageDescription` in EN + MN via `InfoPlist.strings`, add a `LaunchScreen.storyboard` (declared but missing).
- [ ] Entitlements: `aps-environment` → `development` in Debug / `production` in Release; remove unused `appattest-environment`.
- [ ] Add `PrivacyInfo.xcprivacy` (required-reason APIs: UserDefaults `CA92.1`, file timestamp `C617.1` if used; collected data types matching §5.2). Also one per extension that touches UserDefaults/App Group.
- [ ] Set default `serverURL` to `https://primekids.masterclass.mn/parent-helper` (currently `api.primekids.com`) and read it from a build-config `xcconfig` (Debug/Release).
- [ ] Add Firebase Messaging via SPM (D4) + `GoogleService-Info.plist`; register FCM token, not raw APNs hex.
- [ ] Fix compile blocker `ScreenTimeManager.swift:74-81` (`FilterPolicy.auto(except:)` misuse).
- [ ] Move `PrefsManager` to the App-Group `UserDefaults(suiteName:)` and Keychain to a shared access group so extensions can read `childId`/token.
- [ ] `ExportOptions.plist`: literal Team ID (build variables aren't expanded there).
- [ ] **Exit criteria:** archives on this Mac, runs on a physical iPhone, pairs with `PRIME888`, heartbeat + location arrive in the parent app.

### Phase 2 — Feature completion (Weeks 2–5) — the missing-features list

> **Progress 2026-08-18 (build green):** child-iOS — A1–A5, A7, A8 implemented (on-device `FamilyActivityPicker` behind a parent PIN, shields, schedules, daily limit, remote pause, branded EN/MN shield with "Ask parent" forwarded as `shield` blocked-attempts); 2B Safari filter wired + enable-status detection; 2C REST command queue poll (BGAppRefresh + foreground + after push), unpair flow, Socket.IO fixed; 2D **EN + MN localization** (`en.lproj`/`mn.lproj` incl. InfoPlist), Settings screen with privacy/terms/support links, 4-step permission onboarding, two-step location auth. Backend B3 (`DeviceCommand` queue + `GET /devices/commands`, ack), B4 (`iosBlockSelected`, `iosSelection`, device rules default instead of 404, `POST /rules/:childId/ios-selection`), B5 (`shield`/`web_filter` types, `screenTime` summary), B9 (iOS demo device in seed) done. Parent app: RN Firebase messaging for iOS push, `isIosChild` gating (AppRules → selection card + block toggle, Pause/Resume, hidden web history / uninstall toggle / approvals, Safari-only banner), legal links. **Remaining:** A6 per-app limits (P1), A9 richer usage reporting, QR decision (removed from docs), Phase 3 device testing, backend deploy + `npm install` in parent-app, docs reconciliation (§5.3).

Priority: **P0 = must ship for v1**, **P1 = ship if time allows / v1.1**, **P2 = later**.

#### 2A. Screen Time / Family Controls (P0 — the core of the entitlement story)

| # | Feature | Implementation | Owner |
|---|---|---|---|
| A1 | Authorization | Keep `AuthorizationCenter.requestAuthorization(for: .individual)` on the child device (parent enters their Apple ID / device passcode). Persist status in App Group; surface "Screen Time not authorized" to parent via heartbeat field. | iOS |
| A2 | **App selection on the child device** | `FamilyActivityPicker` inside the child app behind a **parent PIN** screen ("Parent settings"). Store `FamilyActivitySelection` (Codable) in App Group; upload base64 blob + counts to backend so the parent app can show "12 apps, 3 categories selected" and toggle blocking remotely. Tokens are device-scoped: the parent picks *on the child device* during setup — this is how Bark/Qustodio do it. | iOS + BE |
| A3 | **Block selected apps** | `ManagedSettingsStore.shield.applications / applicationCategories` from stored selection when `rules.blockedApps` (iOS shape, see §4) is enabled. | iOS |
| A4 | **Schedules / bedtime** | `DeviceActivityCenter.startMonitoring` per schedule rule → **DeviceActivityMonitorExtension** `intervalDidStart/End` applies/clears shields (`shield.applicationCategories = .all()` for full device-off, minus SOS-critical apps). Fix weekday convention bug (`RuleManager.swift:51` vs `RuleModels.swift:21`, 0=Sun). Handle cross-midnight ranges (Android does). | iOS |
| A5 | **Daily limit** | `DeviceActivityEvent(threshold: dailyLimitMin)` on the selection (or `.all()`), `eventDidReachThreshold` → shield. Reset schedule daily 00:00–23:59. | iOS |
| A6 | **Per-app limits** | Same as A5 with per-token events (P1). | iOS |
| A7 | **Shield UI** | `ShieldConfigurationExtension` — Prime Kids branding, MN/EN text ("Screen time limit reached / Bedtime"), `ShieldActionExtension` — "Ask parent" button → posts a request via App Group + BGTask/push. | iOS |
| A8 | **Remote "pause device"** (iOS version of lock) | Command `lock` → shield `.all()`; `unlock` → clear. Delivered by silent push (D4) with REST poll fallback. Persist state so it survives relaunch. | iOS + BE |
| A9 | **Usage reporting** | `DeviceActivityReport` extension is sandboxed — it can *display* usage on the child device but cannot upload it. v1: report **shield events + threshold events + minutes-since-limit** from the monitor extension (App Group → sync); show honest "Screen time on iOS is summarised, not per-app" in the parent app. Update privacy labels/docs accordingly. | iOS |
| A10 | Web content | `store.webContent.blockedByFilter = .auto()` (Apple's adult filter) when the parent enables the "adult" category; keep Safari Content Blocker for custom domains (2B). Note in listing: Safari + WebKit only. | iOS |

#### 2B. Web filtering (P0 minimal)

- [ ] Wire `ContentBlockerService` (currently has **zero callers**): call on pairing, on `rules:updated`, on each activity sync. Fix regex escaping bug (`"\\\\."` → `"\\."`), bundle a default `blockerList.json`, remove force-unwrap crash in `ContentBlockerRequestHandler`.
- [ ] Rules: `customBlock` domains + category domains from `GET /filters` (cap ~50k rules — Safari's limit; prefer top-N categories server-side for iOS).
- [ ] Onboarding step: guide parent to Settings → Safari → Extensions → enable "Prime Kids". Detect via `SFContentBlockerManager.getStateOfContentBlocker` and show status.
- [ ] Browsing-history: **not possible on iOS** — remove from iOS privacy labels & description.

#### 2C. Pairing, commands, sync (P0)

- [ ] **QR pairing**: docs promise it and Android doesn't have it either → **decide**: either implement (`AVCaptureSession`/`DataScannerViewController` + parent app renders QR of the pairing code) or **remove QR from all docs**. Recommendation: remove for v1 (parent app has no QR renderer today).
- [ ] Register WebSocket command handlers on fresh pairing (`AppDelegate.swift:22` bug); handle `lock/unlock/locate/sync/unpair`.
- [ ] Fix Socket.IO handshake (send `40` before `42[...]`), reconnect backoff bug, and event parsing (proper JSON, not substring).
- [ ] Silent-push command path (`content-available: 1`) → same handler; REST poll `GET /devices/commands` on BGAppRefresh (backend §4).
- [ ] Persist location buffer to disk on upload failure (currently dropped).
- [ ] `PairingView` `isLoading` never reset on success.
- [ ] Forced unpair (`device:unpaired` / command) → `PrefsManager.clear()` (never called today), clear shields, stop monitoring, back to pairing.

#### 2D. UX, localization, compliance surfaces (P0)

- [ ] **Localization EN + MN** (`Localizable.xcstrings`) — Android child is MN-only; parent app is bilingual. Ship both.
- [ ] Settings screen: privacy policy + terms links (Apple checks in-app link), app version, server status, "Parent settings" (PIN-gated: manage apps, unpair, re-run permissions).
- [ ] Permission onboarding flow modelled on Android's `OnboardingPermissionsActivity`: Notifications → Location Always (two-step: WhenInUse first, then Always) → Screen Time authorization → Safari extension → done. Each with a bilingual "why" screen (Apple 5.1.1 requires purpose clarity; also matches the Play "prominent disclosure" you already wrote).
- [ ] Battery / online status card; SOS stays reachable even when shields are active (SOS is in our own app, which we never shield).
- [ ] Time-sensitive notification for SOS confirmation; drop `critical` interruption level unless you apply for the Critical Alerts entitlement (backend §4).

#### 2E. P1 / P2 (after v1 submission)

- P1: per-app limits (A6), "Ask for more time" round-trip, DeviceActivityReport view on child, Mongolian App Store localization.
- P2: Live Activity/Widget for status, iPad layout (keep iPhone-only for v1: `TARGETED_DEVICE_FAMILY = 1`).

> **2026-08-19:** Child app **1.0.0 (1) uploaded to App Store Connect** headlessly (archive → export → altool) using an Admin-role ASC API key `44VPNY6FPV`; recipe in `child-ios/scripts/release.sh`. Signed "Apple Distribution: Ulzii Uyalagt Systems LLC", family-controls on app + 3 extensions. Parent app builds 4 & 5 on TestFlight; Android vc9 built (AAB link in chat) — upload to Play manually. ASC listings being filled by the desktop agent (see IOS_ASC_PARENT_SUBMIT_PROMPT.md / IOS_ASC_CHILD_SUBMIT_PROMPT.md).

### Phase 3 — Device testing (Week 5–6)

- [ ] Two-device end-to-end with a real Family Sharing child account: pair → shields fire at schedule → daily limit → remote pause → SOS → geofence entry/exit → unpair.
- [ ] Background survival: 24 h location + heartbeat, app killed by user, device reboot (iOS relaunches for significant-change location; monitor extension keeps shields).
- [ ] Offline/unreachable server behaviour; ATS (HTTPS only) confirmed.
- [ ] Battery impact over 24 h; no crashes in Organizer.
- [ ] TestFlight internal build; run `child-ios/TestFlightChecklist.md`.

---

## 4. Backend changes for iOS (Week 1–3, parallel)

| # | Change | Files |
|---|---|---|
| B1 | `Device.fcmToken` (+ `platform`-aware) and `POST /devices/push-token` under `deviceAuth` (child cannot call `/auth/fcm-token`, it needs a parent JWT). | `models/Device.js`, `routes/devices.js`, `controllers/devicesController.js` |
| B2 | `sendCommandToDevice(deviceId, command)` — silent FCM data message to the child (`apns-push-type: background`, `content-available: 1`) **in addition to** Socket.IO emit; used by `POST /devices/:id/command` and on `rules:updated`. | `services/pushNotification.js`, `devicesController.js:243-279`, `rulesController.js` |
| B3 | Command queue: persist commands with TTL; `GET /devices/commands` (deviceAuth) returns un-acked commands; `POST /devices/commands/:id/ack`. Fallback for iOS BGAppRefresh. | new `models/DeviceCommand.js`, routes |
| B4 | iOS-shaped rules: `Rule.iosSelection: { blob: String(base64 FamilyActivitySelection), appCount, categoryCount, webDomainCount, updatedAt }`, `Rule.blockedApps` untouched for Android; `screenTime.perApp[].appId` allowed to be an opaque token id for iOS. `GET /rules/:childId` should return defaults (not 404) for device clients. | `models/Rule.js`, `validate.js`, `rulesController.js:32` |
| B5 | Activity sync: accept `apps: []` / summary fields (`shieldEvents`, `limitReachedAt`) from iOS; skip `installedApps` for iOS devices. Fix `blockedAttempts.type` enum to include `web_filter` (Android already sends it). | `models/ActivityLog.js`, `activityController.js` |
| B6 | Parent-facing `platform` in child/device DTOs is already there — make sure `listByChild` returns it so the parent app can gate UI (§5). | — |
| B7 | SOS push: `interruption-level: time-sensitive` (not `critical`) unless Critical Alerts entitlement is granted; ship `sos_alarm.caf` in the parent iOS bundle or drop the custom sound. Add `apns` block to `sendBatchAlertNotifications`. | `pushNotification.js:92-101, 135-172` |
| B8 | (D1) IAP: App Store Server Notifications v2 webhook + `POST /subscriptions/apple/verify` (StoreKit 2 JWS) → create/extend `Subscription`. | new controller |
| B9 | Seed script: add an **iOS** demo device (`platform: 'ios'`) to the review account so the parent app shows the iOS-gated UI to reviewers. | `scripts/seed-review-account.js:122` |

---

## 5. Parent app iOS (Week 1–2, parallel) + compliance for both apps

### 5.1 Parent app build fixes

- [ ] `app.json` → `expo.ios`: `buildNumber`, `infoPlist` with `ITSAppUsesNonExemptEncryption: false`, `NSUserNotificationsUsageDescription` (optional), keep `supportsTablet` **only** if you will produce iPad screenshots — otherwise set `false` (recommended for v1).
- [ ] `eas.json`: add `build.production.ios` (+ `preview.ios` with `simulator: false`, `distribution: internal`) and `submit.production.ios` (`appleId`, `ascAppId`, `appleTeamId`).
- [ ] **Push on iOS**: install `@react-native-firebase/app` + `@react-native-firebase/messaging` (config plugin, uses the existing `GoogleService-Info.plist`) and on iOS use `messaging().getToken()`; keep `getDevicePushTokenAsync()` on Android. Update `setNotificationHandler` to `shouldShowBanner/shouldShowList` (SDK 53). Add `sos_alarm.caf` to `expo-notifications` plugin `sounds` or drop it.
- [ ] **Gate Android-only features when `device.platform === 'ios'`**: `AppRulesScreen` (package-name app list) → replace with "iOS app selection is made on the child's device — N apps selected" + block toggle; hide `lock/unlock` → rename to Pause/Resume; hide browsing history, uninstall-attempt toggle, "all browsers" web-filter copy (show "Safari only"); show `AppRules` per-app limits only if `iosSelection` exists.
- [ ] Support contact & legal: replace `mailto:` Gmail; add tappable links to hosted privacy/terms URLs (D5).
- [ ] (D1) IAP subscription screen with **Restore Purchases**, price display, EULA + privacy links (Apple requires both on the purchase screen for auto-renewables).
- [ ] `docs/ios-feature-list.md` says "Sign in with Apple ✅" — not implemented and **not required** (email/password only). Fix the doc; do not add social login (would trigger 4.8).
- [ ] `npx expo prebuild --platform ios` locally once to check the generated `PrivacyInfo.xcprivacy` and `Info.plist`; then `eas build -p ios --profile production`.

### 5.2 Apple compliance checklist (both apps)

| Requirement | Parent | Child | Notes |
|---|---|---|---|
| Privacy policy URL in ASC **and** in-app link | ✅ screen, ⚠️ add URL link | ❌ add Settings screen | D5 URLs |
| App Privacy "nutrition labels" | ❌ write (`parent-app/store-assets/ios/AppPrivacy.md`) | ⚠️ `child-ios/PrivacyNutritionLabels.md` — **remove Browsing History, change Usage Data to "summaries"**, add Coarse/Precise location, Device ID, Crash (Crashlytics if added) | Never mark "Used for tracking" |
| Privacy manifest `PrivacyInfo.xcprivacy` | Expo generates; verify third-party libs (`react-native-maps`, AsyncStorage) ship theirs | ❌ create for app + each extension | Required for new uploads |
| Usage-description strings (EN + MN) | notifications only (no location/camera used) | Location Always/WhenInUse | Missing string = crash + rejection |
| Account deletion in-app (5.1.1(v)) | ✅ (30-day grace OK) | n/a (no account) | — |
| Kids / COPPA positioning | **Not** Kids Category; age rating via the new 2025 questionnaire (expect 4+, "Parental controls" declared) | same; declare "designed for parents to install on child devices" | Don't tick "Made for Kids" |
| Family Controls (5.1.1, 5.5) | n/a | Distribution entitlement approved **before** submitting; description must state parental use with paired parent | Phase 0 |
| Background location justification | n/a | Onboarding "why" screen + reviewer video URL | Reuse Play recording approach |
| Payments (3.1.1) | D1 | none | — |
| Sign in with Apple (4.8) | not needed (no 3rd-party login) | n/a | — |
| Export compliance | `ITSAppUsesNonExemptEncryption=false` | already in Info.plist | HTTPS only = exempt |
| Time-sensitive / critical alerts | Time Sensitive capability; no `critical` unless entitled | Time Sensitive | B7 |
| Xcode / SDK | EAS `image: latest` (Xcode 16+/iOS 18 SDK required since Apr 2025) | Xcode 26.2 on this Mac ✅ | — |
| Content: no misleading claims | Remove "cannot be uninstalled", "all browsers", "browsing history", "QR" from iOS copy | same | Apple 2.3.1 |

### 5.2b Compliance audit — 2026-08-18 (code-verified)

| # | Guideline | Finding | Status |
|---|---|---|---|
| 1 | 3.1.1 / 4.2 | Parent dashboard (inactive subscription) showed "Contact via Messenger" (`m.me/`) and "Tutorial" (`youtube.com`) placeholder cards next to key entry → could read as external purchase channel + dead links | **Fixed** — cards removed |
| 2 | 2.1 | Parent app defaulted to Mongolian; no language switch before login | **Fixed** — owner wants MN default; added МН/EN toggle on Login & Register screens (+ Settings); review notes explain it |
| 3 | 3.1.1 | Reviewer must have an active subscription | Review account seeded with 12-month key; review notes state keys are issued by administrator, no in-app purchase | ✅ |
| 4 | 4.2 | Screen-time "App Limits" picker dead for iPhone children | **Fixed** — gated by `isIosChild`, info line |
| 5 | 2.3 | "Available on Android" copy in dashboard steps | **Fixed** → "iPhone & Android" |
| 6 | 4.0 | Hardcoded "Offline" pill on child cards | **Fixed** — driven by device status |
| 7 | 5.1.1(ii) | Phone number mandatory at registration but unused | **Fixed** — optional in app + backend (`User.phone`, register validator) |
| 8 | 4.0 | Navigation titles hardcoded (mixed EN/MN) | **Fixed** — `nav.*` keys |
| 9 | 4.0 | Assorted mixed-language strings | **Fixed** (main ones) |
| 10 | 5.1.1(v) | Deletion copy said "contact support to cancel"; 30-day purge was manual | **Fixed** — copy reworded; `jobs/deletionPurger.js` runs every 6 h |
| 11 | 4.2 | Android-only alert types visible for iOS-only families | **Fixed** — `new_app_installed` filtered |
| 12 | Push | SOS push used `interruption-level: critical` (needs Apple entitlement) + missing sound file | **Fixed** — `time-sensitive` + default sound; parent app declares Time Sensitive entitlement (**enable capability on `com.parenthelper.parent` App ID**) |
| 13 | Family Controls | Child app used `.individual` only | **Fixed** — `.child` first (parent approval, child can't remove app), `.individual` fallback |
| — | 5.1.1 | Purpose strings: child = location only (EN+MN InfoPlist.strings); parent = notifications only | ✅ |
| — | 5.1.2 | No analytics/ads/tracking SDKs in either app; privacy manifests | ✅ |
| — | 4.8 | Email/password only → Sign in with Apple not required | ✅ |
| — | 5.1.1(v) | In-app account deletion present | ✅ |
| — | 2.1 | No cleartext URLs, no Android-only APIs on iOS path, Apple Maps (no key) | ✅ |
| — | Legal | Privacy/Terms/Support links in both apps; hosted pages live | ✅ (support page needs deploy) |

Still open before submission: real-device test pass (Phase 3), Family Controls (Distribution) approval, DSA trader status, screenshots, App Privacy forms filled from the two AppPrivacy docs.

### 5.3 Reconcile the draft docs (`child-ios/*.md`) with reality

> Done 2026-08-18: `APPLE_REVIEW_NOTES.md`, `AppStoreMetadata.md`, `PrivacyNutritionLabels.md`, `FamilyControlsEntitlement.md`, `TestFlightChecklist.md`, `SETUP.md`, `docs/ios-feature-list.md` rewritten to match the code; parent-app metadata + privacy docs created at `parent-app/store-assets/ios/`.


Before any of these are pasted into Apple forms, edit them so every claim is true for the shipped build:

- `FamilyControlsEntitlement.md` — remove DeviceActivityReport upload claim; describe A1–A8 exactly.
- `APPLE_REVIEW_NOTES.md` — remove QR pairing, uninstall protection, "demo mode"; add the single-device review flow from `REVIEW.md` (`PRIME888`), Family Sharing test-account instructions, and a short screencast URL of pairing → shield firing.
- `AppStoreMetadata.md` — bundle ID per D2, URLs per D5, "Screen time enforced via Apple's Screen Time framework (Safari-only web filtering)", remove "cannot uninstall".
- `PrivacyNutritionLabels.md` — as in §5.2.
- `SETUP.md`/`TestFlightChecklist.md` — update target list and IDs.
- `IOS_BUILD.md` — mark superseded by this file for the child app section.

---

## 6. Store-front assets to create

Create two folders: `parent-app/store-assets/ios/` and `child-ios/store-assets/`.

### 6.1 Per app

| Asset | Spec | Parent | Child |
|---|---|---|---|
| App icon | 1024×1024 PNG, no alpha, no rounded corners | `assets/icon.png` ✅ (verify no alpha) | `Assets.xcassets/AppIcon` ✅ (single 1024 is enough on Xcode 14+) |
| iPhone screenshots | **6.9"** 1320×2868 (or 6.7" 1290×2796); 3–10 images. ASC scales down for smaller sizes. | ❌ capture from iPhone 16 Pro Max simulator: Dashboard, Location map, Alerts, Rules, Activity report, Geofence | ❌ capture on device (Family Controls UI won't render in Simulator for shields — use device + framed template): Pairing, Permissions, Protected dashboard, SOS, Parent settings/app picker |
| iPad screenshots | 13" 2064×2752 / 12.9" 2048×2732 — **only if `supportsTablet: true`** | Recommend `false` for v1 → skip | iPhone-only → skip |
| Screenshot framing | Optional captions in EN (+MN localization later). Use one shared template so both apps look like a family. Tools: Figma / `fastlane frameit` / shot generator. | | |
| App preview video | Optional (15–30 s) — recommended for the child app to pre-empt "background location" and "Family Controls" questions | optional | recommended |
| Name (30) | | `Prime Kids: Parent Helper` | `Prime Kids` (child) — consider `Prime Kids Child` to avoid confusion |
| Subtitle (30) | | `Family safety & screen time` | `Child safety companion` |
| Promotional text (170) | | write | draft exists |
| Description (4000) | source: `docs/android-feature-list.md`, `docs/ios-feature-list.md`, `child/release/PLAY_STORE_DESCRIPTION.md` (monitoring-disclosure section ports well) | ❌ write | ⚠️ revise draft |
| Keywords (100) | | `parental control,screen time,family,location,kids,child safety,geofence,sos,monitor` | draft exists |
| Category | | Primary Lifestyle / Secondary Utilities | Utilities / Lifestyle |
| Age rating | new questionnaire | 4+ | 4+ |
| Support URL / Marketing URL | live pages under `primekids.masterclass.mn` (create a simple `/support` page) | | |
| Privacy Policy URL | D5 | | |
| App Review Information | demo login `review@parenthelper.com / ReviewTest2026!`, code `PRIME888`, notes from `REVIEW.md` + `APPLE_REVIEW_NOTES.md`, contact phone/email, optional video link | | |
| App Privacy answers | from §5.2 docs | | |
| Copyright | `© 2026 <legal entity>` | | |
| Localizations | EN (v1) → add MN listing text in v1.1 | | |

> **Progress 2026-08-18:** child-app screenshots captured from the iPhone 17 Pro Max simulator at 1320×2868 (6.9") in EN (`child-ios/store-assets/screenshots/iphone-6.9/01…05`) and MN (`iphone-6.9-mn/`). Missing: the shield screenshot (device only). Parent-app screenshots still to capture (needs `npm install` + iOS build). Framing/captions optional.
> Debug-only screenshot hooks exist in the child app (`-pkDemo`, `-pkPairCode`, `-pkScene`, `-pkStep`; compiled out of Release) — re-run with `child-ios/scripts/screenshots.sh`. Child shots now use the demo state (all permissions Active, sample usage) and the brand logo.
> **Parent app (2026-08-18):** `npm install` + `expo prebuild` + `pod install` done locally; **first iOS build succeeded** (Firebase Messaging, static frameworks); `tsc` clean. Dev-only demo hooks (`EXPO_PUBLIC_DEMO_LOGIN/SCREEN`, `src/utils/demoHooks.ts`) + `parent-app/scripts/ios-screenshots.sh` capture 7 screens. Captured once, but the live review account currently holds stale test data (no location, junk alerts) → **re-run after `seed-review-account.js` on the server**, then recapture EN + MN.

### 6.2 Files to produce (checklist)

```
parent-app/store-assets/ios/
  AppStoreMetadata.md          (name, subtitle, description, keywords, URLs, review notes)
  AppPrivacy.md                (nutrition labels)
  screenshots/iphone-6.9/01-dashboard.png … 06-*.png
  (optional) screenshots/ipad-13/…
child-ios/store-assets/
  screenshots/iphone-6.9/01-pairing.png … 05-*.png
  preview/child-demo.mp4      (optional)
  ReviewerVideo.md            (script: pairing → permission → shield → SOS)
child-ios/*.md                 (revised per §5.3)
```

---

## 7. Submission sequence & timeline

```
Week 1   Phase 0 (accounts, entitlement request, APNs, Firebase iOS app)
         Child: Xcode project, builds, runs, pairs           Backend: B1–B3, B7
         Parent: 5.1 build fixes, iOS push, eas.json         Assets: templates, parent screenshots
Week 2   Child: 2A A1–A5, 2C                                 Backend: B4–B6, B9
         Parent: platform gating, IAP (D1) start             Parent → TestFlight internal
Week 3   Child: 2A A7–A9, 2B, 2D localisation                Parent: IAP finish, metadata, App Privacy
         → PARENT APP SUBMIT (does not depend on child)      (Apple review 1–3 days; expect one round)
Week 4   Child: 2D onboarding/settings, bug list (App. A)    Docs reconciled (5.3), child screenshots
Week 5   Child: Phase 3 device testing, TestFlight internal  Family Controls entitlement should be back
Week 6   Child: fixes, external TestFlight (Beta review), reviewer video
         → CHILD APP SUBMIT
Week 7-8 Review rounds; buffer for Family Controls / background-location questions
```

Order matters: submit the **parent** first — it is referenced in the child's review notes and Apple will install both.

---

## 8. Top risks

1. **3.1.1 payments (D1)** — highest rejection probability for the parent app; decide in week 1.
2. **Family Controls entitlement latency** — cannot ship child app without it; file day 1, follow up at 3 weeks.
3. **Over-claiming** in existing docs/listing (uninstall protection, all-browser filtering, browsing history, QR) → 2.3.1 rejection. Fixed by §5.3.
4. **Background location + child monitoring** — Apple will ask "why Always". Onboarding disclosure + video mitigate.
5. **iOS push silently broken in the parent app** — would look like "notifications don't work" to a reviewer. Fix in week 1 (5.1).
6. **Command transport** — without D4/B2/B3, remote pause/locate won't work when the child app is backgrounded (i.e., almost always).

---

## Appendix A — Known bugs in `child-ios` (fix in Phase 1–2)

| File:line | Bug |
|---|---|
| `ScreenTimeManager.swift:74-81` | `FilterPolicy.auto(.specific(during:))` — wrong API, likely compile error; `filter` unused |
| `ScreenTimeManager.swift:64-68` | App blocking is a `print(...)` |
| `RuleManager.swift:51` | Weekday index Mon-based, `ScheduleRule.days` documented Sun-based |
| `RuleManager.swift:70` | `updateDailyUsage` never called → dashboard always 0m |
| `ContentBlockerService.swift` | Never called anywhere; regex escaping `"\\\\."` wrong |
| `ContentBlockerRequestHandler.swift:5-7` | Force-unwrap crash if URL unreadable; no bundled `blockerList.json` |
| `AppDelegate.swift:22` | `setupCommandHandlers()` skipped when pairing happens in-session |
| `AppDelegate.swift`, `NotificationManager.swift` | `locate` handler duplicated 3× |
| `WebSocketManager.swift:30-36,110` | Emits before Socket.IO `40` connect; backoff never grows; substring event parsing |
| `ActivitySyncService.swift:33-37` | Drained locations dropped on failed upload |
| `PairingView.swift:110-112` | `isLoading` never reset on success |
| `KeychainManager.swift`, `PrefsManager.swift` | Not App-Group scoped → extensions can't read token/childId |
| `PrefsManager.swift:38` | Default server `https://api.primekids.com` (wrong host) |
| `NotificationManager.swift:41` | Posts to `/auth/fcm-token` (parent-JWT route) → 401 swallowed by `try?` |
| `Info.plist:29` | `armv7` in `UIRequiredDeviceCapabilities` |
| `Info.plist:55` | `NSUserTrackingUsageDescription` present but no tracking → remove |
| `PrimeKidsChild.entitlements` | `aps-environment: production` in all configs; unused App Attest key |
| `ExportOptions.plist:8` | `$(DEVELOPMENT_TEAM)` not expanded |

## Appendix B — Android ↔ iOS parity (what to tell users)

`docs/ios-feature-list.md` is already a good public-facing comparison. Correct these lines: **Remote lock → "Pause device (shields all apps)" ✅ limited**; **Sign in with Apple → remove** (not implemented, not needed); **Screen time reports → "summary only"**; **Bilingual child app → true only after 2D**.
