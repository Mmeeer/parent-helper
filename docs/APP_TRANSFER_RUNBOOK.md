# Prime Kids — App Ownership Transfer Runbook

Transferring **Prime Kids: Parent Helper** (6802229006) and **Prime Kids: Child**
(6802229430) from *Ulzii Uyalagt Systems LLC* (team `2R68Z37544`) to another
Apple Developer account.

State verified against App Store Connect on **2026-09-14**.

> **Order matters.** The TestFlight cleanup Apple is asking for is irreversible
> (expired builds can never be restored). Do it **last**, only once the recipient
> has cleared §1. Everything in §1 can be prepared while the apps stay live.

---

## 0. Where we stand today

| Check | Parent | Child | Verdict |
|---|---|---|---|
| Versions in flight (review / pending release) | none — 1.0.3 Ready for Sale | none — 1.0.4 Ready for Sale | ✅ clear to transfer |
| In-app purchases / subscription groups | 0 / 0 | 0 / 0 | ✅ no Paid-Apps agreement complication |
| iCloud, Sign in with Apple, Apple Pay, Wallet | none | none | ✅ none of Apple's blocked capabilities |
| App Group shared with an app that stays behind | n/a | `group.com.parenthelper.child` — used only by the child app + its own extensions | ✅ nothing left behind |
| TestFlight builds not expired | **9** | **18** | ❌ must be expired |
| TestFlight testers | 2 (1 internal, 1 external) | 2 (1 internal, 1 external) | ❌ must be removed |
| Test Information filled | feedbackEmail, marketingUrl, privacyPolicyUrl, description + full App Review contact/demo | same (no demo account) | ❌ must be cleared |

**Transfer both apps.** They are one product — a parent app alone cannot pair
with a child app owned by a different team, and vice versa.

---

## 1. Prerequisites for the RECIPIENT — settle these first

### 1.1 ⚠️ Family Controls entitlement (the real blocker)
The child app is built on Apple's **Family Controls / Screen Time** frameworks,
which require a **special entitlement Apple grants per developer account** — we
waited for approval before we could ship. Entitlements do **not** travel with a
transferred app.

- The binary already on the App Store keeps working after transfer.
- But the new owner **cannot build, re-sign, or ship any update** to the child
  app until Apple grants *their* account Family Controls (Development **and**
  Distribution).
- They request it at <https://developer.apple.com/contact/request/family-controls-distribution/>.
  Have them apply **now** — approval took us days, and the answer is not
  guaranteed. Do not start the transfer before it is granted.

### 1.2 Account & agreement prerequisites
- Recipient has an **Apple Developer Program organization account** (not
  individual, ideally) in good standing, with the **Account Holder** ready to
  accept the transfer within **60 days** (the invitation expires).
- All agreements in their App Store Connect → Business must be accepted.
- We need from them: **Apple ID email of the account holder** and their
  **Team ID**. Apple asks for both when initiating the transfer.

### 1.3 Push notifications will break unless prepared
Our APNs key `2UXR4MM97C` belongs to team `2R68Z37544` and **cannot be
transferred**. After transfer, the new owner must:
1. Create their own **APNs Auth Key** (Sandbox + Production, team-scoped).
2. Upload it to the Firebase project used by the backend (FCM → APNs bridge).
3. Either take over our Firebase project (Google account transfer) or create a
   new one — if new, the child/parent apps need rebuilt `GoogleService-Info.plist`
   / `google-services.json` and a fresh release.

Until this is done, SOS alerts, geofence alerts and remote commands over push
stop working on iOS for every installed user. **Plan this for the same day as
the transfer.**

### 1.4 Identifiers the new team must recreate
Transfer moves the **app records and their main bundle IDs**. These do *not*
follow automatically and must be re-created in the new account before their
first build:
- Extension App IDs: `com.parenthelper.child.ContentBlocker`,
  `.DeviceActivityMonitorExtension`, `.ShieldConfiguration`, `.ShieldAction`,
  `.NotificationService`
- **App Group `group.com.parenthelper.child`** — App Group IDs are globally
  unique and team-scoped. If Apple will not release it to the new team, they must
  register a different group ID and update `child-ios/Shared/AppGroup.swift`
  plus every target's entitlements. ⚠️ Changing the group ID means the app loses
  access to its existing shared storage on upgrade — pairing state, selections
  and counters reset, so children would need re-pairing. **Ask Apple Developer
  Support explicitly whether the App Group can move with the app**, before the
  transfer, and get the answer in writing.
- New provisioning profiles for all targets (with Family Controls ticked).
- A new **App Store Connect API key** if they want the headless release pipeline
  (`child-ios/scripts/release.sh`) to keep working — the current key `44VPNY6FPV`
  dies with our account.

---

## 2. The TestFlight cleanup Apple is asking for

> Do this immediately before initiating the transfer. **Expiring a build is
> permanent** — to test anything afterwards, a new build must be uploaded by
> whoever owns the app at that time.

For **each** app:

1. **Expire every build.** App Store Connect → TestFlight → iOS builds → select a
   build → **Expire Build**. (9 parent builds, 18 child builds.)
2. **Remove every tester.** TestFlight → Testers & Groups → remove both the
   internal *Testers* member and the external *Coworkers* member; delete the
   external group itself.
3. **Clear all Test Information fields:** Feedback Email, Marketing URL, Privacy
   Policy URL, Description, plus App Review Information (first/last name, phone,
   email, demo account + password on the parent app, and Notes). Every field
   blank.
4. Confirm the transfer page no longer lists the TestFlight criterion.

**This can be scripted.** Claude can do all of steps 1–3 for both apps through
the App Store Connect API in a couple of minutes (expire builds, delete testers
and the external group, blank out `betaAppLocalizations` and
`betaAppReviewDetail`). Just say the word when §1 is settled.

---

## 3. Initiating the transfer (owner-only, in the browser)

1. App Store Connect → **My Apps** → the app → **App Information** →
   scroll to **Additional Information** → **Transfer App**.
2. Apple re-checks the criteria and lists anything outstanding.
3. Enter the recipient's **Apple ID** and **Team ID** → confirm.
4. The recipient's Account Holder accepts in their App Store Connect →
   **Users and Access → Transferred Apps** (within 60 days) and provides bank/tax
   info if needed.
5. Repeat for the second app. Transfers usually complete within a business day;
   the app stays on sale throughout and users keep the app and their reviews.

**What comes across:** app record, bundle ID, ratings and reviews, existing
users, version history.
**What does not:** TestFlight setup, entitlements, certificates/profiles, APNs
keys, App Group, API keys, and the `com.parenthelper.*` App IDs of extensions.

---

## 4. Non-Apple handover (equally important)

| Asset | Action |
|---|---|
| **Google Play** (both apps) | Separate process — Play Console → Setup → *Transfer app*. Needs a transfer token from the recipient's Play account; both accounts must have valid payment profiles. Also hand over `child/keystore.properties` + the release keystore — **without the keystore, the native child app can never be updated again**. |
| **Backend server** | Host/SSH access, `parent-helper-api` + `parent-helper-admin` systemd units, `backend/.env` (Mongo URI, JWT secrets, CallPro key), MongoDB data and backups |
| **Domain** | `primekids.masterclass.mn` DNS + TLS certificates |
| **Firebase** | Project ownership (FCM sender, service account) — see §1.3 |
| **CallPro SMS** | Account `primekidsmongolia@gmail.com`, sender line 72228700, API key — see `docs/CALLPRO_OTP_GUIDE.md` |
| **Source code** | GitHub repo `Mmeeer/parent-helper` ownership or a fork + all `.p8` keys stored outside git |
| **Admin panel** | Admin account credentials; create an admin for the new owner, remove old ones |
| **Legal** | Privacy policy / support pages currently naming *Ulzii Uyalagt Systems LLC* must be updated by the new owner; App Store copyright line too |

---

## 5. Suggested sequence

1. Recipient applies for **Family Controls (Distribution)** → wait for approval.
2. Ask Apple Support in writing about the **App Group** (§1.4).
3. Recipient prepares APNs key + Firebase plan (§1.3).
4. Hand over backend, domain, repo, keystores, CallPro (§4) — can be done early.
5. **Only then:** TestFlight cleanup (§2) → initiate transfers (§3).
6. Same day: new APNs key into Firebase; verify a real push end to end.
7. Recipient rebuilds both apps under their team and ships a small update to
   prove the whole pipeline works before anything urgent comes up.
8. Play Store transfer (§4).
