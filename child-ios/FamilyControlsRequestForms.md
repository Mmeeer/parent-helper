# Family Controls (Distribution) — copy-paste answers for the 4 requests

Form: https://developer.apple.com/contact/request/family-controls-distribution/ (sign in as **Account Holder** of team Ulzii Uyalagt Systems LLC, `2R68Z37544`).
Submit once per bundle ID below. Field names on Apple's form change occasionally — map the closest field; if a field isn't listed here, ask.

Common values:
- **Team / Organization:** Ulzii Uyalagt Systems LLC (Team ID 2R68Z37544)
- **App name:** Prime Kids
- **Companion app:** Prime Kids: Parent Helper (`com.parenthelper.parent`)
- **Existing store presence:** Google Play — `com.parenthelper.child` and `com.parenthelper.parent` (approved 2026)
- **Privacy policy:** https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html
- **Support:** https://primekids.masterclass.mn/parent-helper/support.html · ub1o1genko@gmail.com
- **Parental control app?** Yes
- **Target users:** parents/guardians managing their own children's iPhones

---

## Request 1 — `com.parenthelper.child` (main app)

**App description**

Prime Kids is a parental-control / family-safety product made of two apps. Parents install "Prime Kids: Parent Helper" on their own phone and pair it with the "Prime Kids" child app on their child's iPhone using a one-time pairing code. Both apps are already published and approved on Google Play. The child app is installed on the child's device only by the parent or guardian, and all monitoring data is visible only to that paired parent.

**How the app uses Family Controls**

- During setup on the child's device we call `AuthorizationCenter.shared.requestAuthorization(for: .individual)`; the parent authenticates to grant it.
- Behind a parent PIN on the child device, `FamilyActivityPicker` lets the parent choose which apps and categories are managed. The selection is stored on the device.
- `ManagedSettingsStore` shields the selected apps when the parent enables blocking, when the child reaches the parent-set daily screen-time limit, and during parent-configured bedtime/school schedules. It also enables Apple's web-content filter when the parent turns on adult-content filtering.
- A `DeviceActivityMonitor` extension applies/clears shields at schedule boundaries and when the daily-limit threshold is reached.
- `ShieldConfiguration` and `ShieldAction` extensions show a Prime Kids shield with an "Ask parent" action.
- The parent can remotely pause/resume the child's device (shield all apps) from the paired parent app.

We do not sell, share, or use any usage data for advertising. Data is transmitted over TLS to our own backend and is accessible only to the paired parent account.

---

## Request 2 — `com.parenthelper.child.DeviceActivityMonitor`

**Description**

App extension (Device Activity Monitor) of the Prime Kids child app `com.parenthelper.child` (separate request submitted for the containing app). It receives `DeviceActivitySchedule` interval and threshold callbacks and applies or clears `ManagedSettingsStore` shields for parent-configured bedtime/school schedules and daily screen-time limits. It has no UI and no network access of its own; it shares state with the app via the App Group `group.com.parenthelper.child`.

---

## Request 3 — `com.parenthelper.child.ShieldConfiguration`

**Description**

App extension (Shield Configuration) of the Prime Kids child app `com.parenthelper.child` (separate request submitted for the containing app). It customises the appearance of the shield shown over apps restricted by the parent — Prime Kids branding and a bilingual (English/Mongolian) explanation such as "Bedtime" or "Daily limit reached". No data collection.

---

## Request 4 — `com.parenthelper.child.ShieldAction`

**Description**

App extension (Shield Action) of the Prime Kids child app `com.parenthelper.child` (separate request submitted for the containing app). It handles the buttons on the shield: "Close" and "Ask parent", the latter records a request in the shared App Group so the child app can forward it to the paired parent. No other data collection.

---

## After submitting

Fill in `IOS_PHASE0.md` § 0.4 table (date, case ID). Expect 2–4 weeks; follow up at 3 weeks. Development builds on your own devices work immediately with the development entitlement.
