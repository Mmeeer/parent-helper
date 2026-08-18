# iOS Phase 0 — Browser Runbook (for Claude browser extension)

Purpose: execute the Apple Developer / App Store Connect / Firebase setup steps for the Prime Kids iOS apps. Written so a browser-automation assistant can follow it task by task. Human = the account owner watching the session.

**Rules for the agent (read first)**
1. Do tasks in order; **finish and verify one task before starting the next.**
2. **Never create a duplicate.** Every task starts with a "Check first" step — if the item already exists, skip creation and only verify/adjust settings.
3. **Stop and hand back to the human** when: a sign-in / 2FA / passkey prompt appears; a file must be downloaded (`.p8`, `.plist`); a form asks for payment or legal agreement acceptance; anything on screen differs materially from this document. Say exactly what you see and what you need.
4. Type values **exactly** as written in the Values table (case-sensitive, no extra spaces). Prefer "Explicit" identifiers, never wildcards.
5. Do not press **Submit/Register/Upload** twice. After each submit, read the confirmation and record it in the **Report** section at the end.
6. Do not change anything not listed here (no deleting IDs, keys, apps, or team members).
7. At the end, output the completed **Report** block.

---

## Values

| Key | Value |
|---|---|
| Team name | Ulzii Uyalagt Systems LLC |
| Team ID | `2R68Z37544` |
| Parent bundle ID | `com.parenthelper.parent` |
| Child bundle ID | `com.parenthelper.child` |
| Child extensions | `com.parenthelper.child.DeviceActivityMonitor` · `com.parenthelper.child.ShieldConfiguration` · `com.parenthelper.child.ShieldAction` · `com.parenthelper.child.ContentBlocker` |
| App Group | `group.com.parenthelper.child` |
| Parent app store name | `Prime Kids: Parent Helper` (fallback: `Prime Kids Parent Helper`) |
| Child app store name | `Prime Kids` (fallback 1: `Prime Kids Child`, fallback 2: `Prime Kids: Child`) |
| Parent SKU | `PRIMEKIDS-PARENT-001` |
| Child SKU | `PRIMEKIDS-CHILD-001` |
| Primary language | English (U.S.) |
| Privacy policy URL | `https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html` |
| Support URL | `https://primekids.masterclass.mn/parent-helper/support.html` |
| Support email | `ub1o1genko@gmail.com` |
| Google Play links | parent `https://play.google.com/store/apps/details?id=com.parenthelper.parent` · child `https://play.google.com/store/apps/details?id=com.parenthelper.child` |
| Firebase project | `prime-kids` (Google account chosen by the human) |
| APNs key name | `Prime Kids APNs` |
| ASC API key name | `EAS Submit` |

---

## Task 1 — Verify Apple Developer account (developer.apple.com)

**URL:** https://developer.apple.com/account
**Check first / Verify:**
1. Page shows the team **Ulzii Uyalagt Systems LLC** and membership status **Active**. If a sign-in or 2FA appears → hand back to human.
2. Open **Membership details** (left nav or card) → confirm **Team ID = 2R68Z37544**.
3. Open https://appstoreconnect.apple.com/agreements → confirm the **Free Apps** (Apple Developer Program License Agreement) row shows **Active** (not "Pending" / "Action needed"). If it needs acceptance → hand back to human (legal agreement).

**Record:** membership status, agreement status.

---

## Task 2 — App Group (Identifiers)

**URL:** https://developer.apple.com/account/resources/identifiers/list/applicationGroup
**Check first:** if a row with identifier `group.com.parenthelper.child` exists → skip to Verify.
**Steps:**
1. Click the blue **+** next to "Identifiers".
2. Select **App Groups** → **Continue**.
3. Description: `Prime Kids Child` · Identifier: `group.com.parenthelper.child`.
4. **Continue** → **Register**.
**Verify:** list contains `group.com.parenthelper.child`.

---

## Task 3 — App IDs (Identifiers) — six of them

**URL:** https://developer.apple.com/account/resources/identifiers/list (filter dropdown top-right: **App IDs**)

**Check first:** search/scan the list for each bundle ID below. If it exists → open it, make sure the capabilities in its row are ticked (edit if needed, **Save**), then move on. Do not create a second one.

**Steps for each missing ID:**
1. **+** → **App IDs** → **Continue**.
2. Type: **App** → **Continue**.
3. Description: from table (letters/spaces only).
4. Bundle ID: select **Explicit**, type the exact ID.
5. **Capabilities** tab: tick the listed items.
   - **App Groups**: tick → click **Configure** (or **Edit**) → tick `group.com.parenthelper.child` → **Continue**.
   - **Family Controls (Development)**, **Push Notifications**, **Time Sensitive Notifications**: just tick. Do **not** tick "Family Controls App and Website Usage" (separate capability, not needed).
6. **Continue** → **Register**.

| # | Description | Bundle ID | Capabilities |
|---|---|---|---|
| 1 | `Prime Kids Parent` | `com.parenthelper.parent` | Push Notifications |
| 2 | `Prime Kids Child` | `com.parenthelper.child` | Family Controls · App Groups (select group) · Push Notifications · Time Sensitive Notifications |
| 3 | `Prime Kids Child DA Monitor` | `com.parenthelper.child.DeviceActivityMonitor` | Family Controls · App Groups (select group) |
| 4 | `Prime Kids Child Shield Config` | `com.parenthelper.child.ShieldConfiguration` | Family Controls · App Groups (select group) |
| 5 | `Prime Kids Child Shield Action` | `com.parenthelper.child.ShieldAction` | Family Controls · App Groups (select group) |
| 6 | `Prime Kids Child Content Blocker` | `com.parenthelper.child.ContentBlocker` | App Groups (select group) |

**Expected quirks:**
- "Identifier is not available" for `com.parenthelper.parent` → it already exists; open it and verify Push Notifications is ticked.
- Capability list is alphabetical; there are two Family Controls rows — tick **"Family Controls (Development)"** only; leave "Family Controls App and Website Usage" unticked. If neither is present, stop and report.
- Background Modes are not in this list — expected.

**Verify:** all six IDs listed under filter "App IDs". Open #2 and confirm Family Controls, App Groups, Push, Time Sensitive show as enabled.

---

## Task 4 — Family Controls (Distribution) entitlement — team-level

**Precondition:** signed in as the **Account Holder**.
**URL:** https://developer.apple.com/contact/request/family-controls-distribution/

As of Aug 2026 this page is a **single account-level request**: name/email/Team ID pre-filled and read-only, a Terms & Conditions box, and one **Get Entitlement** button. It grants the entitlement to the whole team (`2R68Z37544`) — no per-bundle-ID form.

**Steps:**
1. Read what the page shows. **Do not click "Get Entitlement" yourself — hand back to the human** (it accepts Apple's Family Controls terms on behalf of the organization).
2. After the human clicks: read the confirmation text — record whether it says granted / pending review, and the date.
3. Return to https://developer.apple.com/account/resources/identifiers/list → open `com.parenthelper.child` → Capabilities: if a **"Family Controls (Distribution)"** entry now exists, tick it and **Save**; repeat for `.DeviceActivityMonitor`, `.ShieldConfiguration`, `.ShieldAction`. Keep "Family Controls (Development)" ticked as well. If "(Distribution)" is not present yet, leave it and note "re-check later".

**Verify / Record:** granted-or-pending, date, and whether "(Distribution)" was tickable on the four App IDs.

_(If the page instead shows the older per-app form with app name / bundle ID / description fields, use the paste-ready texts in `child-ios/FamilyControlsRequestForms.md`, one submission per bundle ID.)_

---

## Task 5 — APNs authentication key

**URL:** https://developer.apple.com/account/resources/authkeys/list
**Check first:** if a key named `Prime Kids APNs` (or any key with "Apple Push Notifications service" enabled) already exists → do **not** create another; record its Key ID and tell the human they must locate the previously downloaded `.p8` (Apple does not allow re-download).
**Steps:**
1. **+** (Create a key).
2. Key Name: `Prime Kids APNs`.
3. Tick **Apple Push Notifications service (APNs)** → click **Configure** (Apple requires it before creating). Settings — cannot be changed later: **Environment: Sandbox & Production** · **Key restriction: Team Scoped (All Topics)** → **Save** → **Continue** → **Register**.
4. On the confirmation page: read the **Key ID** and record it. Then **hand back to the human to click Download** (`AuthKey_<KEYID>.p8`, downloadable **once**). Ask them to save it to their password manager and note where.
**Verify:** key appears in the list with "APNs" service. **Record** Key ID and the download location the human reports.

---

## Task 6 — Firebase: APNs key + child iOS app

**URL:** https://console.firebase.google.com/ → project **prime-kids** (if a Google sign-in appears → hand back).

### 6.1 Upload APNs key
1. ⚙ **Project settings** → **Cloud Messaging** tab.
2. Under **Apple app configuration**, for the app **com.parenthelper.parent** → **APNs Authentication Key** → **Upload** (if a key is already uploaded, record its Key ID and skip).
3. In the dialog: choose the `.p8` file (human must pick it from disk → hand back for the file chooser), Key ID from Task 5, Team ID `2R68Z37544` → **Upload**.
**Verify:** the APNs Authentication Key section shows the Key ID and Team ID.

### 6.2 Add the child iOS app
1. Project settings → **General** tab → **Your apps** → **Add app** → Apple (iOS) icon. **Check first:** if `com.parenthelper.child` already appears under Your apps → skip to step 4.
2. Apple bundle ID: `com.parenthelper.child` · App nickname: `Prime Kids Child iOS` · App Store ID: leave blank → **Register app**.
3. **Download GoogleService-Info.plist** → hand back to human: save it as `child-ios/PrimeKidsChild/GoogleService-Info.plist` in the repo. Click **Next** through the SDK/init/steps → **Continue to console**.
4. **Cloud Messaging** tab again: confirm the child app is listed under Apple app configuration with the APNs key. If it shows its own **Upload** button → upload the same `.p8` / Key ID / Team ID.
**Verify:** two Apple apps (`com.parenthelper.parent`, `com.parenthelper.child`), both with APNs key configured.

---

## Task 7 — App Store Connect app records (two)

**URL:** https://appstoreconnect.apple.com/apps
**Check first:** if an app with the bundle ID already exists → open it, record its **Apple ID** (App Information → General Information) and skip creation.

For each app:
1. **My Apps** → blue **+** → **New App**.
2. Platforms: tick **iOS**.
3. Name: from Values (if "name is already in use" → try the fallback names in order; record which one was accepted).
4. Primary Language: **English (U.S.)**.
5. Bundle ID: pick from dropdown (`Prime Kids Parent - com.parenthelper.parent` / `Prime Kids Child - com.parenthelper.child`). If the dropdown doesn't show it yet, wait 5 minutes and reload (Task 3 propagation).
6. SKU: from Values.
7. User Access: **Full Access**.
8. **Create**.
9. On the new app: **App Information** (left nav) → note the numeric **Apple ID** → record. In **General Information** set **Privacy Policy URL** = Values → **Save**. (Leave everything else for later.)

**Verify:** both apps listed under My Apps. **Record** app names accepted + both Apple IDs.

---

## Task 8 — App Store Connect API key (for EAS submit)

**URL:** https://appstoreconnect.apple.com/access/integrations/api
**Precondition:** if the page says "Request Access" → click it and accept if it's only a terms checkbox; if it needs the Account Holder → hand back.
**Check first:** if a key named `EAS Submit` exists → do not create another; record Key ID + Issuer ID and tell the human to locate the previously downloaded `.p8`.
**Steps:**
1. **Team Keys** tab → **+** (Generate API Key).
2. Name: `EAS Submit` · Access: **App Manager** → **Generate**.
3. Record the **Issuer ID** (top of page) and the new key's **Key ID**.
4. **Download API Key** — one-time; hand back to human. Ask them to save it as `parent-app/asc-api-key.p8` (git-ignored) and in the password manager.
**Verify:** key listed as Active. **Record** Issuer ID + Key ID.

---

## Task 9 — Register test devices (optional, only if UDIDs provided)

**URL:** https://developer.apple.com/account/resources/devices/list
Only if the human gives you a device name + UDID: **+** → Platform iOS → Name/UDID → **Continue** → **Register**. Otherwise skip (Xcode registers automatically).

---

## Report (fill and return to the human)

```
Task 1  Membership: ____   Free Apps agreement: ____
Task 2  App Group group.com.parenthelper.child: created / already existed
Task 3  App IDs: parent ____ | child ____ | DAMonitor ____ | ShieldConfig ____ | ShieldAction ____ | ContentBlocker ____
Task 4  Family Controls entitlement: granted / pending   date ____   "(Distribution)" tickable on 4 App IDs: yes/no
Task 5  APNs Key ID: ____   .p8 saved at: ____
Task 6  Firebase APNs uploaded: yes/no   child app added: yes/no   plist saved to child-ios/PrimeKidsChild/: yes/no
Task 7  ASC parent app: name ____ Apple ID ____ | child app: name ____ Apple ID ____ | privacy URL set: yes/no
Task 8  ASC API key: Issuer ID ____  Key ID ____  saved as parent-app/asc-api-key.p8: yes/no
Anything that differed from the runbook: ____
```

After the report, the human/Claude Code will: put the ASC IDs into `parent-app/eas.json`, tick the boxes in `IOS_PHASE0.md`, and start Phase 1 (Xcode project).
