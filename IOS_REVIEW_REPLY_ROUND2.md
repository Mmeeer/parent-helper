# Round-2 review replies (2026-08-24)

## A. Parent app (6802229006) — reply covering 2.3.10, 2.3.6, 2.1(b)

```
Hi, thanks for the detailed notes. All three points are addressed below.

2.3.10 — Android references
You're right, the description mentioned Android because the same service also runs there. We've rewritten the description and promotional text so they only describe the iPhone experience, with no reference to Android or any other third-party platform. We also removed the single place inside the app where a setup step mentioned Android; that change is in the new build attached to this version. The screenshots show the app itself in use — dashboard, the child's location on the map, alerts, screen time rules, activity report, web filter and safe zones.

2.3.6 — Age Rating
That was our mistake. The app helps parents manage their child's separate device; it does not contain in-app parental controls or age assurance mechanisms that restrict content inside this app. We have set "Parental Controls" to None in the Age Rating questionnaire.

2.1(b) — Business model
1. Who uses the paid features: parents and guardians of pupils at schools in Mongolia that have licensed Prime Kids. The parent is the end user; the school is the paying customer.

2. Where users purchase: nowhere — parents never buy anything, from us or from anyone else. Prime Kids is licensed to schools as organizations. A school contracts with us (Ulzii Uyalagt Systems LLC) directly, and the school's administrator then issues activation keys to the parents of its pupils from our school admin panel. There is no purchase flow, no price, and no link to any purchase anywhere in the app.

3. What previously purchased content a user can access: a parent enters the key their school gave them, which activates the family-safety features for their own children — location and safe zones, SOS alerts, screen time rules and web filtering, and activity summaries — up to the number of children covered by that school's license.

4. What is unlocked without In-App Purchase: the features listed above. They are unlocked by the school-issued key, not by any consumer transaction. Nothing digital is sold to the users of the app at any point, inside or outside it.

5. Sold to single users, consumers, or for family use: to organizations only — schools. It is never sold to individual consumers. Prime Kids was built specifically for Mongolian schools as part of a children's wellbeing programme supported by a government grant; each participating school's administrator creates and distributes the keys to its pupils' families.

We're glad to provide our school licensing agreement or the grant documentation if that would help confirm this.
```

## B. Child app (6802229430) — simplified App Review Information notes

```
Prime Kids: Child is installed by a parent on their child's iPhone. The app itself has no login.

How to review it:
1. Open the app and enter the pairing code PRIME888. It pairs instantly with our demo family account, and the code can be reused as often as you like.
2. Follow the setup: allow notifications and location, then authorise Screen Time (device passcode or a parent's Apple ID). If the test device is not in a Family Sharing group the app still works — the Screen Time items simply show "Not set up".
3. Tap the gear icon, then Parent settings, and create any PIN. That screen shows the app picker and the current rules.

To see the parent side, install "Prime Kids: Parent Helper" (App ID 6802229006) and sign in with review@parenthelper.com / ReviewTest2026!. From there you can view the child's location, send Locate or Pause, change schedules and limits, and unpair the device.

What the app does: it shares the device's location with the parent for safe-zone alerts, gives the child an SOS button, and enforces the parent's screen time rules through Family Controls (app shields, bedtime and school schedules, a daily limit, and remote pause). Web filtering is a Safari content-blocker extension. There are no purchases, ads, tracking or third-party logins.

Family Controls (Distribution) is enabled for our team, 2R68Z37544.
```

---

## C. Child app (6802229430) — round-3 reply: 5.1.1(iv) + 2.5.1 (build 5)

```
Hi, thanks for the review. Both points are fixed in build 1.0 (5).

5.1.1(iv) — Location permission
You're right on both counts and we've changed the flow:
- The button before the system prompt now says "Continue" instead of "Allow location".
- The "Skip for now" button is gone. The explanation screen now always leads straight to the system permission request, so the user makes the decision in iOS's own dialog.
- We also removed the line that suggested choosing "Always Allow". The screen now only explains what the feature does (the parent can see the device's location, safe-zone alerts, and location attached to an SOS) and notes that iOS will ask next and the choice can be changed later in Settings.

2.5.1 — Where the Screen Time features are
Sorry these were hard to find. They were behind the setup flow, so if setup was skipped nothing appeared. In build 5 they are on the app's main screen, in a "Parental controls" card:
- If Screen Time has not been authorised yet, the card shows "Not set up" with a "Set up Screen Time" button that triggers the FamilyControls authorisation (a parent or guardian approves with their Apple ID or the device passcode). Any error iOS returns is now shown on screen.
- Once authorised, the same card shows the managed apps count, the daily limit, the number of schedules and whether app blocking is on, with a "Manage apps & limits" button that opens Apple's FamilyActivityPicker (behind a parent PIN — create any 4-6 digit PIN on first use).

What the Screen Time APIs are used for:
- FamilyControls: authorisation, and FamilyActivityPicker for the parent to choose which apps/categories are managed on this device.
- ManagedSettings: shields those apps when the parent turns blocking on, when a bedtime/school schedule is active, when the daily limit is reached, or when the parent pauses the device from the companion app. ShieldConfiguration/ShieldAction customise that shield and its "Ask parent" button.
- DeviceActivity: schedule and daily-limit monitoring that triggers the shields.
The app never hides or removes apps; it only shields them, and everything is controlled by the parent.

To see it end to end: launch the app, enter pairing code PRIME888, follow the short setup, then use the "Parental controls" card on the main screen. The companion app "Prime Kids: Parent Helper" (App ID 6802229006, review@parenthelper.com / ReviewTest2026!) can then change limits and schedules, and pause or resume the device.
```
