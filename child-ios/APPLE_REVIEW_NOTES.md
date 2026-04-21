# Apple Review Notes — Prime Kids Child App

## 1. App Purpose

Prime Kids is a **parental control and child safety** application. It consists
of two companion apps:

- **Prime Kids: Parent Helper** (parent's device) — the control center
- **Prime Kids** (child's device) — this app

The child app is installed on a minor's device by the parent/guardian. It
enables the parent to monitor location, manage screen time, filter web content,
and receive emergency SOS alerts.

---

## 2. FamilyControls Entitlement Justification

This app requires the **FamilyControls** capability to:

- **Monitor screen time** using `DeviceActivityMonitor` to report app usage
  durations to the parent/guardian
- **Enforce app restrictions** using `ManagedSettings` to block specific apps
  or categories when screen time limits are exceeded
- **Shield applications** during restricted hours as configured by the parent

### Why FamilyControls is necessary
Without FamilyControls, iOS does not provide any API for a third-party app to
monitor or restrict app usage. This is the only Apple-sanctioned mechanism for
parental control apps to enforce screen time rules on iOS.

### Authorization flow
1. The parent installs the Parent Helper app and creates an account
2. The parent installs this app on the child's device
3. During the pairing process, the app calls
   `AuthorizationCenter.shared.requestAuthorization(for: .individual)`
4. The system prompts for the **parent/guardian's Apple ID** credentials
   (Family Sharing)
5. Only after the parent authenticates does the app gain FamilyControls access
6. The child cannot grant or revoke this authorization

---

## 3. Consent Flows

### Parental Consent (Required)
- The app **cannot function** without explicit parent/guardian authorization
- During pairing, the parent must:
  1. Scan a QR code or enter a pairing code from the child's device
  2. Authenticate with their Apple ID (Family Sharing) for FamilyControls
  3. Grant location permission ("Always Allow") on the child's device
  4. Enable push notification permission
- All monitoring features are disabled until pairing is complete

### Location Permission
- The app requests "Always" location permission with a clear explanation:
  *"Prime Kids needs your location to keep you safe and allow your parent to
  see where you are."*
- If the user denies location, the app functions in limited mode (no location
  tracking, no geofences, no SOS with GPS)

### Push Notification Permission
- Requested during setup with explanation of purpose (SOS alerts, rule updates)
- App functions without it but real-time alerts are degraded

---

## 4. Family Sharing Requirement

This app is designed to work within Apple's **Family Sharing** ecosystem:

- The child's Apple ID must be part of the parent's Family Sharing group
- FamilyControls authorization requires the parent/guardian's Apple ID, which
  must be the family organizer or a parent/guardian in the Family Sharing group
- This ensures only authorized adults can enable monitoring

---

## 5. Data Collection Transparency

All data collected is clearly disclosed:
- **Location:** GPS coordinates for safety monitoring
- **Device ID:** For pairing and authentication only
- **App Usage:** Screen time and app usage durations
- **Web History:** URLs visited (Safari only, via Content Blocker)
- **Device Status:** Battery level, online/offline status

No data is sold or shared with third parties. All data is only accessible to
the paired parent/guardian. See the full privacy policy at:
https://parenthelper.com/legal/privacy-policy.html

---

## 6. Child Safety Measures

- The child **cannot** disable monitoring without parent approval
- The child **cannot** unpair the device without parent approval
- SOS button is always accessible regardless of screen time rules
- The app does not contain any user-generated content, social features,
  messaging, or advertising
- No in-app purchases

---

## 7. Testing Instructions for Apple Review

Since this app requires a companion Parent Helper app for full functionality:

1. **Install the Parent Helper app** (separate submission) on a reviewer device
2. **Create a test account** using email: review@parenthelper.com / password: ReviewTest2026!
3. In the Parent Helper app, tap "Add Child" and follow the setup flow
4. On the child device (this app), the pairing screen will display automatically
5. Scan the QR code from the parent app or enter the 6-digit pairing code
6. Grant all requested permissions (location, notifications)
7. The dashboard will show active monitoring status

**Note:** FamilyControls features (screen time enforcement, app blocking) require
the devices to be in the same Family Sharing group. For review purposes, the
app will display these features in a "demo mode" if FamilyControls authorization
is not available.

---

## 8. Guideline Compliance

| Guideline | Compliance |
|-----------|------------|
| 1.3 Kids Category | Not listed in Kids category; this is a Utilities app for parents |
| 2.5.1 Software Requirements | Uses only public APIs (FamilyControls, CoreLocation, UserNotifications) |
| 5.1.1 Data Collection | All collection disclosed in privacy labels and privacy policy |
| 5.1.2 Data Use and Sharing | No third-party data sharing; data used only for stated purpose |
| 5.1.3 Health and Health Research | N/A |
| 5.1.4 Kids | COPPA compliant; parental consent required for all data collection |
| 5.2.5 Apple ID | Uses Family Sharing for authorization; does not misuse Apple ID |
