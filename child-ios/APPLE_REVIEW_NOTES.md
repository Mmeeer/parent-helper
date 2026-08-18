# Apple Review Notes — Prime Kids: Child (com.parenthelper.child)

Paste the "Notes for Review" section into App Store Connect → App Review Information. Keep the rest for reference.

## 1. What the app is

Prime Kids is a **parental-control / family-safety** product made of two apps:

- **Prime Kids: Parent Helper** (`com.parenthelper.parent`) — the parent's control center
- **Prime Kids: Child** (`com.parenthelper.child`) — this app, installed on the child's iPhone **by the parent/guardian**

Both apps are already published on Google Play (same bundle/package IDs). This app is not for children to install themselves and is not in the Kids Category; it is a Utilities app for parents.

## 2. Family Controls usage (why we need the entitlement)

| API | How we use it |
|---|---|
| `AuthorizationCenter.requestAuthorization(for: .child)` (fallback `.individual`) | Requested during onboarding on the child device; the parent/guardian approves. |
| `FamilyActivityPicker` | Shown **on the child device** behind a parent PIN ("Parent settings → Manage apps & categories"). The parent picks which apps/categories/sites the rules apply to. Only counts (N apps / M categories) are sent to our backend, plus the opaque selection blob so it can be restored — tokens are never interpreted server-side. |
| `ManagedSettingsStore` shields | Applied when the parent turns on "Block selected apps", when the parent remotely **pauses** the device (all apps shielded), when a bedtime/school schedule is active, when the daily screen-time limit is reached. `webContent.blockedByFilter = .auto()` when the parent enables adult-content filtering. |
| `DeviceActivityMonitor` extension | Receives schedule interval callbacks and the daily-limit threshold event and applies/clears the shields. |
| `ShieldConfiguration` / `ShieldAction` extensions | Branded shield (English/Mongolian) with "Close" and "Ask parent" — the latter is forwarded to the parent app as a request. |

We request `.child` authorization first (Family Sharing child account: the parent approves with their Apple ID and the child cannot remove the app or revoke authorization without the parent) and fall back to `.individual` on devices that are not Family Sharing children. Unpairing in-app requires the parent PIN; the parent can also unpair from the parent app.

## 3. Other capabilities & permissions

- **Location (Always)** — the parent sees the child's location and gets safe-zone (geofence) entry/exit alerts, and the child's SOS button attaches GPS. Onboarding explains this before the system prompt; the app requests When-In-Use first, then Always. Background modes: `location`, `fetch`, `processing`, `remote-notification`.
- **Notifications** — SOS confirmation and rule-change notices; remote-notification background mode is used for silent "sync/locate/pause/unpair" commands from the parent app (delivered through Firebase Cloud Messaging → APNs).
- **Safari Content Blocker** extension — blocks websites in the parent's filter list / selected categories. Safari only; onboarding tells the user to enable it under Settings → Safari → Extensions.
- No camera, contacts, photos, microphone, tracking, ads or third-party analytics. `ITSAppUsesNonExemptEncryption = false` (HTTPS only).

## 4. Data & privacy

Collected (linked to the paired parent account, never used for tracking): precise location, device identifier (pairing), coarse app-usage summaries (limit reached / shield events — not per-app minutes), battery/online status, crash diagnostics. Sent over TLS to our backend at `primekids.masterclass.mn`. Privacy policy: https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html · Support: https://primekids.masterclass.mn/parent-helper/support.html · ub1o1genko@gmail.com

## 5. Notes for Review (paste into App Store Connect)

```
Prime Kids: Child is the child-device companion of "Prime Kids: Parent Helper"
(also submitted; both live on Google Play). A parent installs this app on their
child's iPhone and pairs it with their own account. It uses Family Controls
(authorized by the parent on the child device) to shield apps chosen by the
parent, enforce bedtime/school schedules and a daily limit, and to let the
parent pause the device remotely; Always-location for safe-zone alerts and the
child's SOS button; and a Safari content-blocker extension for web filtering.

SINGLE-DEVICE REVIEW FLOW (no second device needed):
1. Install "Prime Kids: Parent Helper" and sign in:
     review@parenthelper.com / ReviewTest2026!
   The account is pre-populated (2 children, devices, rules, alerts, location).
2. Install this app on the same or another iPhone and enter pairing code
     PRIME888
   It pairs instantly into the review account's demo child. The code is
   reusable and never expires.
3. Grant Notifications and Location ("Always" or "While Using" — either works
   for review). Screen Time authorization requires a parent's Apple ID or
   the device passcode; if your test device is not in a Family Sharing group,
   the app still works — Screen Time-dependent screens show "Not set up".
4. In the parent app you can then: see location, send "Locate", "Pause"
   (shields all apps on the child device when Screen Time is authorized),
   change schedules/limits, and unpair.

Family Controls (Distribution) was requested for team 2R68Z37544 on
2026-08-17. Privacy policy and support pages are linked in-app under
Settings → Legal.
```

## 6. Guideline mapping

| Guideline | How we comply |
|---|---|
| 1.3 / 5.1.4 Kids | Not in Kids Category; parent-facing utility; parental consent is inherent (parent installs & authorizes). |
| 2.3.1 Accurate metadata | Listing states Safari-only filtering, Screen-Time-based enforcement, no uninstall protection on iOS. |
| 2.5.1 Public APIs | FamilyControls, ManagedSettings, DeviceActivity, CoreLocation, UserNotifications, SafariServices only. |
| 3.1.1 Payments | No purchases in this app. |
| 5.1.1 Data collection & storage | Purpose strings + onboarding disclosure; privacy manifest; App Privacy labels match code. |
| 5.1.2 Data use & sharing | No third-party sharing, no tracking, no ads. |
| 5.5 / Family Controls | Parental-control use case exactly as the entitlement request describes. |
