# Reply package for the Guideline 2.1 "Information Needed" request

Two parts: (A) the screen recording you must capture on your iPhone, (B) paste-ready written answers for the Resolution Center (one block per app). Reply in App Store Connect → the app → App Review → Resolution Center: paste the text and attach the video(s).

Fill the two placeholders marked ⟨…⟩ (your iPhone model + iOS version) before sending.

---

## A. Screen recordings (physical device, latest iOS)

Record with Control Center → Screen Recording, starting **before you launch the app**. One continuous take per app is fine; trim the ends. Transfer to the Mac via AirDrop and attach in the Resolution Center reply (or upload both).

### Parent Helper recording (~2–3 min) — shot list
1. Launch **Prime Kids: Parent Helper** from the home screen (recording already running).
2. Login screen appears (Mongolian default) → tap the **EN** toggle → tap **Sign Up** → register a NEW throwaway account (name, email like test+rec@…, password; phone left empty) → notification-permission prompt appears → Allow.
3. Log out, then **log in** with the demo account `review@parenthelper.com / ReviewTest2026!`.
4. Dashboard with the two demo children → open **Saraa** → Location (map), Alerts, Reports, Rules (Screen Time schedule + daily limit), Web filter.
5. Devices → show Pause/Resume buttons and Locate.
6. Settings → Subscription screen (shows the active plan; key entry visible) → Language switch → **Privacy Policy** links.
7. Settings → **Delete account** → show the confirmation dialog → confirm on the throwaway account (NOT the review account) → app returns to login. *(Do this logged into the throwaway account from step 2 so the demo account stays intact.)*

### Child recording (~90 s) — shot list (see also child-ios/ReviewerVideo.md)
1. Launch **Prime Kids: Child** (recording already running) → pairing screen.
2. Enter **PRIME888** → Pair → onboarding: Allow **Notifications** prompt → Allow **Location** prompt (Always/While Using) → **Authorise Screen Time** (system sheet + passcode) → Safari-extension step → Finish → dashboard "Device Protected".
3. ⚙ → Parent settings → create PIN → **Manage apps & categories** → pick 2–3 apps.
4. Switch to the parent app → App Rules → **Block selected apps** ON → back to child phone → open a picked app → **Prime Kids shield**.
5. Parent app → Devices → **Pause** → child shows shield on any app → **Resume**.
6. Child app → hold **SOS** → parent app shows the SOS alert.

---

## B1. Resolution Center reply — Prime Kids: Parent Helper (6802229006)

```
Thank you for the review. Answers below; a screen recording captured on a physical device (iPhone 15 Pro, iOS 26.5.2) is attached. It begins at app launch and shows registration with the notification-permission prompt, login, the core features (children dashboard, child location map, alerts, activity reports, screen-time rules, web filter, device pause/locate), the subscription screen, and the in-app account-deletion flow.

2. DEVICES AND OS TESTED
- iPhone 15 Pro, iOS 26.5.2 (physical device, TestFlight build 1.0.0(5))
- iPhone 17 Pro Max simulator, iOS 26.x (development)
- The same JavaScript codebase ships on Android (Google Play, com.parenthelper.parent), tested on multiple Android 13–15 devices.

3. PURPOSE AND TARGET AUDIENCE
Prime Kids: Parent Helper is the parent-facing app of a two-app parental-control system for families in Mongolia. Target audience: parents and legal guardians of children aged ~5–17. Problem solved: parents need one place to know where their child is and to manage the child's device use. Value: live location with safe-zone (geofence) alerts and an SOS channel from the child, screen-time limits and bedtime schedules, app blocking, web filtering, and activity summaries. The companion app "Prime Kids: Child" (App ID 6802229430, also in review) runs on the child's device; an Android child app is already published on Google Play.

4. SETUP AND ACCESS
- Sign in with the demo account: review@parenthelper.com / ReviewTest2026! (email-verified, active 12-month subscription, pre-populated with two children, a paired device, location history, alerts and rules).
- The app opens in Mongolian by default; tap the "EN" toggle on the login screen (or Settings > Language) for English.
- To exercise the full pairing flow, install "Prime Kids: Child" on any iPhone and enter the reusable pairing code PRIME888 — it pairs into this demo account's child instantly.
- Account deletion: Settings > Delete account (30-day grace period, cancellable by signing in again).
- New accounts require a subscription key to add children. Keys are issued directly by the service administrator to families (offline distribution in Mongolia); there is no purchase, price, or external purchase link inside the app, and no auto-renewable subscription is sold in the app. The demo account is already activated.

5. EXTERNAL SERVICES
- Our own backend API (Node.js/MongoDB) at primekids.masterclass.mn — accounts, children, rules, locations, alerts (HTTPS).
- Firebase Cloud Messaging (Google) — push notification delivery via APNs. No Firebase Analytics.
- Apple Maps (MapKit via react-native-maps) — map display.
- No payment processors, no advertising SDKs, no AI services, no third-party authentication/social login, no tracking.

6. REGIONAL DIFFERENCES
None. The app functions identically everywhere; UI is available in Mongolian and English. Distribution is currently limited to Mongolia by our choice in Pricing and Availability.

7. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not applicable. Parental-control software for a family's own children; no protected third-party content. Consent model: the parent creates the account, installs the child app on their child's device and authorises monitoring during pairing; this is disclosed in-app and in the privacy policy (https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html, incl. COPPA statement).
```

## B2. Resolution Center reply — Prime Kids: Child (6802229430)

```
Thank you for the review. Answers below; a screen recording captured on a physical device (iPhone 15 Pro, iOS 26.5.2) is attached. It begins at app launch and shows: pairing with the code PRIME888, the permission prompts (notifications, location, Screen Time / Family Controls authorisation with the system sheet, Safari content-blocker enablement), the parent-PIN "Parent settings" screen with Apple's FamilyActivityPicker, and enforcement — the Prime Kids shield appearing over a blocked app, remote pause/resume from the parent app, and the SOS button.

2. DEVICES AND OS TESTED
- iPhone 15 Pro, iOS 26.5.2 (physical device, TestFlight build 1.0.0(1))
- iPhone 17 Pro Max simulator, iOS 26.x (development; Family Controls flows verified on the physical device).

3. PURPOSE AND TARGET AUDIENCE
Prime Kids: Child is the child-device companion of "Prime Kids: Parent Helper" (App ID 6802229006, also in review). A parent installs it on their child's iPhone and pairs it with their own account. Purpose: child safety — the parent sees the device's location with safe-zone alerts, receives SOS alerts, and manages screen time (app shielding, bedtime/school schedules, daily limit, remote pause) enforced through Apple's Family Controls / ManagedSettings / DeviceActivity frameworks, plus Safari web filtering via a content-blocker extension. Target audience: installed and configured by parents/guardians; used on devices of children aged ~5–17.

4. SETUP AND ACCESS
- No login. Launch the app and enter the reusable pairing code PRIME888 — it pairs into our demo parent account (review@parenthelper.com / ReviewTest2026!, for the parent app).
- Follow onboarding: allow notifications and location ("Always" preferred, "While Using" also works for review), authorise Screen Time (device passcode or a parent's Apple ID; if the test device is not in a Family Sharing group the app still works — Screen-Time items show "Not set up"), optionally enable the Safari extension under Settings > Safari > Extensions.
- Parent-side controls: in the parent app, App Rules > "Block selected apps", Devices > Pause/Resume/Locate. On the child device, Settings > Parent settings (create any 4–6-digit PIN) > "Manage apps & categories" opens Apple's FamilyActivityPicker.
- The app uses only the sanctioned shielding APIs (ManagedSettingsStore.shield / ShieldConfiguration / ShieldAction / DeviceActivityMonitor); apps are shielded, never hidden.

5. EXTERNAL SERVICES
- Our own backend API (Node.js/MongoDB) at primekids.masterclass.mn (HTTPS) — pairing, rules, locations, alerts.
- Firebase Cloud Messaging (Google) — silent push delivery of parent commands via APNs. No analytics.
- Apple frameworks: FamilyControls, ManagedSettings(UI), DeviceActivity, CoreLocation, SafariServices.
- No payment processors, no ads, no AI services, no tracking.

6. REGIONAL DIFFERENCES
None. Identical functionality everywhere; Mongolian and English UI. Distribution currently limited to Mongolia by choice.

7. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not applicable — parental-control software using Apple's Family Controls entitlement (granted to team 2R68Z37544). Parental consent is inherent to the design: the parent performs installation, pairing and the Screen Time authorisation. Privacy policy: https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html.
```

---

## C. After replying
- Also copy the "2.–7." answers into each app's App Review Information **Notes** (Apple asked for that for future submissions) — appending is fine.
- The child app's TestFlight run doubles as the device test from RELEASE_CHECKLIST.md §2 — note anything that misbehaves while recording and tell me BEFORE replying, so we can fix + re-upload instead.
