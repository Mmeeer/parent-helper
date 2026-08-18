# iOS Phase 0 — Accounts & Prerequisites (action plan)

Parent doc: [IOS_SUBMISSION_PLAN.md](IOS_SUBMISSION_PLAN.md) §2. Goal: everything Apple/Firebase/EAS-side that code work depends on, done in ~2 days.
Assumes decisions **D2 = `com.parenthelper.*`** and **D5 = `https://primekids.masterclass.mn/parent-helper/legal/…`**. Change the IDs below if you decide otherwise — but decide *before* step 0.3.

Legend: 🔴 blocks other work · ⏳ has a waiting period · 👤 must be done by the Account Holder

---

## Day 1

### 0.1 Confirm the Apple Developer account 👤
- [x] Team: **Ulzii Uyalagt Systems LLC** · Team ID **`2R68Z37544`** (Organization account) — applied to `child-ios/ExportOptions.plist` and `parent-app/eas.json` on 2026-08-17.
- [x] Account type: Organization → seller name on the App Store will be "Ulzii Uyalagt Systems LLC".
- [x] Free Apps agreement Active (Aug 13 2026 – Aug 13 2027). Paid Apps agreement unsigned — not needed (D1 = key-only).
- [ ] App Store Connect → **Users and Access** → invite the developers who will upload builds (role: *App Manager* or *Developer*).
- [ ] Xcode → Settings → Accounts → **+** → sign in with the Apple ID → the team appears. `xcodebuild -showBuildSettings` isn't needed; just confirm the team is listed.

**Output:** Team ID recorded; team members invited.

### 0.2 Decide D2 and D5 (5 min, blocks everything below) 🔴
- [x] Bundle-ID family: **`com.parenthelper.child`** — renamed throughout `child-ios/` on 2026-08-17.
- [x] Legal URLs verified live (200) on 2026-08-17; support page created at `backend/public/support.html` → **deploy backend** so `https://primekids.masterclass.mn/parent-helper/support.html` resolves.
- [x] Support email: `ub1o1genko@gmail.com` (matches live privacy policy; terms/COPPA HTML updated to match — deploy).
- [ ] (reference) Legal URLs check:
  ```sh
  curl -sI https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html | head -1
  curl -sI https://primekids.masterclass.mn/parent-helper/legal/terms-of-service.html | head -1
  curl -sI https://primekids.masterclass.mn/parent-helper/legal/coppa.html | head -1
  ```
- [x] Support URL: `https://primekids.masterclass.mn/parent-helper/support.html` (after deploy).

### 0.3 Register identifiers 🔴
developer.apple.com → Certificates, Identifiers & Profiles → **Identifiers**

**App Group** (do first): **+ → App Groups** → `group.com.parenthelper.child`. ✅ done 2026-08-17

**App IDs** (**+ → App IDs → App**, *Explicit* bundle ID):

| # | Bundle ID | Description | Capabilities to enable |
|---|---|---|---|
| 1 | `com.parenthelper.parent` | Prime Kids Parent | Push Notifications, **Time Sensitive Notifications** *(added 2026-08-18 — tick it on the existing App ID; EAS also syncs it automatically)* |
| 2 | `com.parenthelper.child` | Prime Kids Child | **Family Controls**, App Groups (→ select the group), Push Notifications, Time Sensitive Notifications |
| 3 | `com.parenthelper.child.DeviceActivityMonitor` | Child – DA monitor ext | **Family Controls**, App Groups |
| 4 | `com.parenthelper.child.ShieldConfiguration` | Child – shield config ext | **Family Controls**, App Groups |
| 5 | `com.parenthelper.child.ShieldAction` | Child – shield action ext | **Family Controls**, App Groups |
| 6 | `com.parenthelper.child.ContentBlocker` | Child – Safari blocker ext | App Groups |

Notes: Background Modes are set in Info.plist, not here. Ticking Family Controls gives the **development** entitlement immediately.

**Output:** 6 App IDs + 1 App Group visible in the Identifiers list. ✅ done 2026-08-17 (child + 3 extensions have "Family Controls (Development)"; "App and Website Usage" left unticked).

### 0.4 File the Family Controls (Distribution) requests 👤 ⏳ 🔴
- [x] Submitted 2026-08-17 (team-level, Account Holder clicked Get Entitlement).
- [ ] (Aug 2026: the page is now a single team-level **Get Entitlement** button + T&C — Account Holder clicks it once; then tick "Family Controls (Distribution)" on the 4 App IDs when it appears.) ~~Submit **4 requests** — one each for App IDs #2, #3, #4, #5.~~ Use the narrative in the previous message / [IOS_SUBMISSION_PLAN.md](IOS_SUBMISSION_PLAN.md) §2; for the extensions add "This is an app extension of com.parenthelper.child (request submitted separately)."
- [ ] Attach/paste: Play Store links for both apps, privacy-policy URL, 2–3 Android screenshots if the form allows.
- [ ] Record the date + case IDs in this file:

  | Scope | Submitted | Case/ref | Approved |
  |---|---|---|---|
  | Team-level (2R68Z37544) — covers com.parenthelper.child + 3 extensions | 2026-08-17 ("We'll review your request and contact you soon") | none given | ✅ **granted by 2026-08-18** — "Family Controls (Distribution)" row is tickable on the child App IDs (tick it on all 4 — see IOS_ASC_LISTING_RUNBOOK.md Task 1) |

- [ ] Follow up if silent after **3 weeks**. Approval email → App ID shows "Family Controls (Distribution)".

**Output:** 4 requests filed; clock started (2–4 weeks).

### 0.5 APNs key + Firebase
- [x] APNs key created 2026-08-17: **`Prime Kids APNs` · Key ID `2UXR4MM97C`** · Sandbox & Production · Team Scoped (All Topics). File `AuthKey_2UXR4MM97C.p8` downloaded — store in the password manager (never in git).
- [x] Firebase: APNs key uploaded to all 4 slots (dev + prod × parent + child) with `2UXR4MM97C` / `2R68Z37544`.
- [x] Parent iOS Firebase app confirmed (`com.parenthelper.parent`).
- [x] Child iOS Firebase app added (`com.parenthelper.child`, GOOGLE_APP_ID `1:787600193492:ios:ee5f1af826963f8fbf8841`); plist saved at `child-ios/PrimeKidsChild/GoogleService-Info.plist` ✅ verified.

**Output:** APNs key uploaded once for both apps; two iOS Firebase apps; child plist on disk.

---

## Day 2

### 0.6 App Store Connect records
App Store Connect → **My Apps → + → New App** (bundle IDs from 0.3 appear in the dropdown after a few minutes).

| Field | Parent | Child |
|---|---|---|
| Platform | iOS | iOS |
| Name (30 chars, must be unique on the store) | `Prime Kids: Parent Helper` | `Prime Kids` → if taken: `Prime Kids Child` |
| Primary language | English (U.S.) | English (U.S.) |
| Bundle ID | com.parenthelper.parent | com.parenthelper.child |
| SKU | `PRIMEKIDS-PARENT-001` | `PRIMEKIDS-CHILD-001` |
| User access | Full | Full |

- [x] Created 2026-08-17: **Prime Kids: Parent Helper** = Apple ID **6802229006** (in `eas.json`), **Prime Kids: Child** = Apple ID **6802229430**. Company Name (public seller) set to "Prime Kids". Privacy Policy URL set on both (now lives under App Privacy → Privacy Policy).
- [x] Privacy Policy URL set on both apps.

### 0.6b DSA trader status (EU distribution)
- [ ] App Store Connect → Business → **Digital Services Act** (or the banner on the Apps page) → declare trader status for Ulzii Uyalagt Systems LLC (trader = yes, add address/phone/email that Apple will show on EU storefronts). Required before either app can be distributed in the EU; do it before submission.

### 0.7 App Store Connect API key (for EAS submit / CI)
- [x] Key `EAS Submit` (App Manager) created: Issuer ID `70a1985a-c2f0-475c-a86c-5c2ee5bdc7e4`, Key ID `4RX2G9R256` — both in `eas.json`. `.p8` saved as `parent-app/asc-api-key.p8` (copy of root `AuthKey_4RX2G9R256.p8`; both git-ignored) ✅
- [x] `eas.json` submit.production.ios wired (`ascApiKeyPath: ./asc-api-key.p8`).

### 0.8 Test devices & Family Sharing
- [ ] Register test iPhone UDIDs: Devices → + (or let Xcode do it on first run). Need ≥1 iPhone on iOS 16+, ideally 2.
- [ ] Create a **child Apple ID** inside your Family Sharing group (Settings → Family → Add Member → Create Child Account) and sign the "child" iPhone into it. Family Controls shielding is only meaningful on a device signed into a child account with the parent authorising.
- [ ] Optionally enable Family Sharing on the "parent" iPhone that will run the parent app via TestFlight.

### 0.9 Backend / reviewer readiness
- [ ] On the server: `cd backend && node scripts/seed-review-account.js` (idempotent) — refreshes `review@parenthelper.com` / `PRIME888`.
- [ ] Confirm `REVIEW_ACCOUNT_EMAIL` and `REVIEW_DEMO_PAIRING_CODE=PRIME888` are set in prod `.env` and the API restarted.
- [ ] Confirm the backend Firebase service-account env (`FIREBASE_*`) is set — iOS push goes through the same FCM path once 0.5 is done.

### 0.10 EAS (parent app)
- [ ] `cd parent-app && npx eas-cli login && npx eas-cli whoami`.
- [ ] `npx eas-cli credentials -p ios` → let EAS create the Distribution certificate + provisioning profile for `com.parenthelper.parent` (it will ask to sign in with the Apple ID; 2FA/app-specific password OK for this one-time step). Push key: choose "use existing" and upload the same APNs `.p8` from 0.5, or let EAS create a second key (also fine — Apple allows 2 APNs keys).
- [ ] Add the iOS build/submit profiles to `eas.json` (Phase 5.1) — can be done now with the values gathered above.

---

## Exit criteria for Phase 0

- [ ] Team ID, ASC app IDs, APNs Key ID, ASC API Key ID/Issuer recorded (in your password manager + the tables above).
- [ ] 6 App IDs + App Group registered; 4 Family Controls requests filed with dates.
- [ ] Both ASC app records exist with privacy URL set.
- [ ] Firebase has APNs key + both iOS apps; child `GoogleService-Info.plist` on disk.
- [ ] Reviewer account reseeded; env vars live.
- [ ] Two test iPhones, one signed into a Family Sharing child account.

Then start **Phase 1** (Xcode project) — it does not wait on the entitlement approval.
