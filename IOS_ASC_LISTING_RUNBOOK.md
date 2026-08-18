# App Store Connect Listing Runbook (for the browser AI)

Team **Ulzii Uyalagt Systems LLC (2R68Z37544)** · Parent app **6802229006** "Prime Kids: Parent Helper" · Child app **6802229430** "Prime Kids: Child".
Rules: do tasks in order; **Save** after each section; never Submit for Review; stop and hand back to the human for logins/2FA, legal declarations (DSA), and any file-chooser dialog (screenshots). Type values exactly. At the end output the Report.

Files on this Mac (for uploads): `/Users/mergenganbat/Desktop/drd/parent-helper/`

---

## Task 1 — Enable Family Controls (Distribution) on the child App IDs (developer.apple.com)

The row is tickable, which means Apple granted the team entitlement. On https://developer.apple.com/account/resources/identifiers/list open each of these, tick **Family Controls (Distribution)** (keep "(Development)" ticked; leave "App and Website Usage" unticked), **Save** (confirm the "modify" prompt):
- `com.parenthelper.child`
- `com.parenthelper.child.DeviceActivityMonitor`
- `com.parenthelper.child.ShieldConfiguration`
- `com.parenthelper.child.ShieldAction`

Verify each shows Distribution enabled afterwards.

---

## Task 2 — Parent app (6802229006): App Information

- **Category:** Primary **Lifestyle**, Secondary **Utilities**
- **Content Rights:** "does not contain, show, or access third-party content"
- **Age Rating → Set Up / Edit** — answer the questionnaire: every content question (violence, sexual content/nudity, profanity, horror, alcohol/tobacco/drugs, gambling, contests, medical/treatment) = **None**; **Unrestricted Web Access = No**; **Gambling = No**; **User-Generated Content = No**; **Messaging/chat = No**; **Advertising = No**; **Parental Controls = Yes** (if asked "does the app include parental controls?"); **Age assurance = No**; **Made for Kids = No**. Expected result **4+**. Save.
- Leave Name/Subtitle for Task 3.

## Task 3 — Parent app: version 1.0 page ("1.0 Prepare for Submission")

Fill (English (U.S.)):
- **Subtitle (30):** `Family safety & screen time`
- **Promotional Text:** `See where your kids are, get safe-zone and SOS alerts, and manage screen time and web filtering — for Android and iPhone children, from one app.`
- **Description:** paste from `parent-app/store-assets/ios/AppStoreMetadata.md` section "Description" (from "Prime Kids: Parent Helper is the parent's control center…" through the Support line).
- **Keywords:** `parental control,screen time,family,location,kids,child safety,geofence,sos,web filter,monitor`
- **Support URL:** `https://primekids.masterclass.mn/parent-helper/support.html`
- **Marketing URL:** `https://primekids.masterclass.mn/parent-helper/support.html`
- **Copyright:** `© 2026 Ulzii Uyalagt Systems LLC`
- **Version:** 1.0.0
- **Screenshots — iPhone 6.9" display:** upload in this order (hand back for the file chooser):
  1. `parent-app/store-assets/screenshots/iphone-6.9/01-dashboard.png`
  2. `…/02-location.png`  3. `…/03-alerts.png`  4. `…/04-screen-time.png`  5. `…/05-reports.png`  6. `…/06-web-filter.png`  7. `…/07-geofences.png`
  (No iPad screenshots — the app is iPhone-only.)
- **Build:** select **1.0.0 (4)** (the TestFlight build).
- **App Review Information:** Sign-in required = **Yes**; User name `review@parenthelper.com`; Password `ReviewTest2026!`; Contact: first/last name of the account holder, phone, email `ub1o1genko@gmail.com`; **Notes:** paste the block from `child-ios/APPLE_REVIEW_NOTES.md` §5 ("Notes for Review") — it covers both apps — and prepend: `Subscription access is activated with a key issued by the family's administrator; there is no purchase inside the app. The review account already has an active 12-month subscription.`
- **Version Release:** Manually release this version.
- Save. Do **not** click "Add for Review / Submit".

## Task 4 — Parent app: App Privacy

App Privacy → **Get Started** → "Do you collect data?" **Yes**. Select and configure (each: **Linked to user = Yes** unless noted, **Used for tracking = No**, purpose **App Functionality**):
- Contact Info → **Email Address**, **Name**
- Location → **Precise Location**
- Identifiers → **User ID**, **Device ID**
- Usage Data → **Product Interaction**
- Diagnostics → **Crash Data** (Linked = **No**)
Nothing else. **Publish**.

---

## Task 5 — Child app (6802229430): App Information

- **Category:** Primary **Utilities**, Secondary **Lifestyle**
- **Content Rights:** does not contain third-party content
- **Age Rating:** same answers as Task 2 (**Parental Controls = Yes**, everything else None/No, Made for Kids = No) → 4+. Save.

## Task 6 — Child app: version 1.0 page

- **Subtitle:** `Child safety companion`
- **Promotional Text:** `Keep your child safe with Prime Kids. Location sharing, safe-zone alerts, an SOS button, screen-time rules and Safari filtering — all managed by the parent app.`
- **Description:** paste from `child-ios/AppStoreMetadata.md` section "Description".
- **Keywords:** `parental control,child safety,screen time,family,location,kids,safe zone,SOS,web filter,monitor`
- **Support URL / Marketing URL:** `https://primekids.masterclass.mn/parent-helper/support.html`
- **Copyright:** `© 2026 Ulzii Uyalagt Systems LLC`
- **Screenshots — iPhone 6.9":** `child-ios/store-assets/screenshots/iphone-6.9/01-pairing.png`, `02-onboarding-location.png`, `03-dashboard.png`, `04-settings.png`, `05-parent-settings.png` (in that order; hand back for the file chooser).
- **Build:** none yet (uploaded later) — leave empty.
- **App Review Information:** Sign-in required = **No** for this app itself, but fill the same demo account anyway; Notes = the same §5 block (it explains the pairing code `PRIME888` and the single-device flow).
- Save. Do not submit.

## Task 7 — Child app: App Privacy

"Do you collect data?" **Yes**:
- Location → **Precise Location** (Linked Yes, Tracking No, App Functionality)
- Identifiers → **Device ID** (Linked Yes)
- Usage Data → **Product Interaction** (Linked Yes)
- Diagnostics → **Crash Data**, **Performance Data** (Linked No)
Nothing else (no Browsing History, no Contact Info). **Publish**.

---

## Task 8 — Localization (optional now, recommended): add **Mongolian** to both apps

App Information → Localizable Information → **+ language → Mongolian**; version page → language menu → add Mongolian. Only if the UI offers Mongolian. Fill: Name same; Subtitle parent `Гэр бүлийн аюулгүй байдал`, child `Хүүхдийн аюулгүй байдлын апп`; Description = the Mongolian sections in the same metadata files (if absent, skip description); screenshots from `…/screenshots/iphone-6.9-mn/`. If Mongolian is not offered, skip and report.

## Task 9 — DSA trader status (hand back)

Open the DSA dialog, choose **"I'm a trader"**, and stop — hand back to the human to enter the company address / phone / email that will be public (Account Holder decision).

---

## Report
```
1  FC (Distribution) ticked on: child ___ | DAMonitor ___ | ShieldConfig ___ | ShieldAction ___
2/3 Parent: category ___ | age rating result ___ | version fields saved yes/no | screenshots uploaded N/7 | build 1.0.0(4) attached yes/no | review info saved yes/no
4  Parent App Privacy: published yes/no (types: ___)
5/6 Child: category ___ | age rating ___ | version fields saved yes/no | screenshots uploaded N/5 | review info saved yes/no
7  Child App Privacy: published yes/no (types: ___)
8  Mongolian localization: added / not offered
9  DSA: handed back — status ___
Anything unexpected: ___
```
