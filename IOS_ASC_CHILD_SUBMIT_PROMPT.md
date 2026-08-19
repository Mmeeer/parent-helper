# Mission: prepare "Prime Kids: Child" (iOS) for App Store review — DO NOT SUBMIT

You are operating my Mac. Get the App Store Connect listing of the **child app** ready for review, then stop and report. **Never click "Add for Review", "Submit for Review", or anything that starts the review.** I will do that myself.

## Environment on this Mac
- A desktop/Space already has a **browser window signed in to App Store Connect**. Use it (switch Spaces with Control+→ / Mission Control). Do not sign out. If Apple asks for a password or 2-factor code, **stop and ask me** — never type an Apple ID password.
- Project files: `/Users/mergenganbat/Desktop/drd/parent-helper/`. Use Finder / the file chooser to pick files.
- If a page differs from what I describe, do the closest sensible thing and mention it in the report.

## Project facts
| Item | Value |
|---|---|
| App | **Prime Kids: Child** — the companion app a parent installs on the child's iPhone (location sharing, SOS, Screen-Time-based app limits, Safari filtering). Managed from the parent app "Prime Kids: Parent Helper". |
| App Store Connect App ID | **6802229430** · bundle `com.parenthelper.child` · Team Ulzii Uyalagt Systems LLC (2R68Z37544) |
| Version to prepare | **1.0** (1.0.0). **No build is uploaded yet** — leave the Build section empty unless a build named 1.0.0 (N) is already listed; then attach the newest one and tell me. |
| Sister app (do NOT edit today) | Prime Kids: Parent Helper, App ID 6802229006 (already prepared) |
| Reviewer demo account (parent app) | `review@parenthelper.com` / `ReviewTest2026!` |
| Reviewer pairing code (this app) | `PRIME888` — pairs the child app into the demo account instantly, reusable |
| Support / marketing URL | `https://primekids.masterclass.mn/parent-helper/support.html` |
| Privacy policy URL (already set — one policy covers both apps) | `https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html` |
| Support email | `ub1o1genko@gmail.com` |
| Copyright | `© 2026 Ulzii Uyalagt Systems LLC` |
| Availability | Free, **Mongolia only** (already set — verify, don't add countries) |
| Business model | No purchases of any kind in this app. |

## Already done (verify, don't redo)
Categories (Utilities / Lifestyle), App Privacy **published**, subtitle `Child safety companion`, promotional text, keywords, support/marketing URL, copyright, Pricing = Free / Mongolia only, Family Controls (Distribution) enabled on the App IDs.

## Missions (in order)

### 1. Age rating
App Information → **Age Rating → Set Up / Edit**. Answers: all content categories (violence, sexual content/nudity, profanity, horror, alcohol/tobacco/drugs, gambling, contests, medical) = **None**; Unrestricted Web Access = **No**; Gambling = **No**; User-Generated Content = **No**; Messaging/chat = **No**; Advertising = **No**; **Parental Controls = Yes**; Age assurance = **No**; **"Social Media Disabled for Users Under 13" = Yes** (no social features exist); Made for Kids = **No**. Save; report the resulting rating (expected 4+).

### 2. Version 1.0 page — Description
Open **1.0 Prepare for Submission** (English (U.S.)). Verify subtitle/promo/keywords/URLs/copyright, then paste this **Description** exactly (plain text):

```
Prime Kids: Child is the companion app that a parent or guardian installs on their child's iPhone. It pairs with Prime Kids: Parent Helper on the parent's phone so the family can stay safe together.

How it works
1. Install Prime Kids: Parent Helper on the parent's phone and create an account.
2. Install Prime Kids: Child on the child's iPhone.
3. Enter the pairing code from the parent app, then grant the requested permissions.

What parents get
• Location sharing — see where the child's device is, with alerts when it enters or leaves a safe zone you define.
• SOS button — the child holds the button to send an alert with their location.
• Screen-time rules — pick which apps and categories are managed (right on the child's iPhone, protected by a parent PIN), set a daily limit and bedtime or school schedules. Rules are enforced with Apple's Screen Time framework and shown as a Prime Kids shield.
• Pause the device — temporarily shield all apps from the parent app.
• Safari filtering — block websites by category or by domain with the Prime Kids Safari extension.
• Ask parent — the child can request more time from the shield; the parent gets a notification.
• English and Mongolian.

Good to know (iPhone)
• Web filtering applies to Safari only. Other browsers are not filtered.
• Screen-time enforcement uses Apple's Screen Time; a parent or guardian authorises it once on the child's device.
• Remote "lock" is not possible on iPhone — Prime Kids offers "pause", which shields all apps.
• The parent can unpair the device from the parent app at any time.

Privacy
Location, device status and screen-time summaries are visible only to the paired parent account. No ads, no tracking, no data sales. Privacy policy: https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html

Support: https://primekids.masterclass.mn/parent-helper/support.html
```
Save.

### 3. Screenshots (iPhone)
In the iPhone 6.9-inch (or 6.5-inch, whichever slot the page requires) area upload these 5 files **in order** from `/Users/mergenganbat/Desktop/drd/parent-helper/child-ios/store-assets/screenshots/iphone-6.9/`:
`01-pairing.png`, `02-onboarding-location.png`, `03-dashboard.png`, `04-settings.png`, `05-parent-settings.png` (1320×2868 PNG). Drag from Finder or use the file chooser (multi-select is fine). If the slot rejects the size, create resized copies in Terminal: `cd /Users/mergenganbat/Desktop/drd/parent-helper/child-ios/store-assets/screenshots && mkdir -p iphone-6.5 && for f in iphone-6.9/*.png; do sips -z 2778 1284 "$f" --out "iphone-6.5/$(basename $f)" >/dev/null; done` and upload those. No iPad screenshots. Wait for uploads to finish; Save.

### 4. Build
Leave empty unless a processed build is listed (then attach the newest and tell me which). If an export-compliance question appears, answer **No** (standard HTTPS only).

### 5. App Review Information
- Sign-in required: **No** (this app has no login; it pairs with a code — see notes). If the form insists on credentials anyway, set Sign-in required = Yes and use `review@parenthelper.com` / `ReviewTest2026!`.
- Contact information: First name / Last name / Phone / Email — use the same values as on the parent app's review page (open the parent app 6802229006 → 1.0 → App Review Information to copy them, then come back). If they're empty there, **ask me**. Email `ub1o1genko@gmail.com`.
- **Notes** — set exactly:

```
Prime Kids: Child is the child-device companion of "Prime Kids: Parent Helper" (App ID 6802229006, submitted separately). A parent installs this app on their child's iPhone and pairs it with their own account. Both apps are already published on Google Play (com.parenthelper.child / com.parenthelper.parent).

WHAT IT DOES: Family Controls (authorised by the parent on the child's device) shields apps the parent selected on this device (FamilyActivityPicker behind a parent PIN), enforces bedtime/school schedules and a daily limit, and lets the parent pause the device remotely (shield all apps). Always-location for safe-zone alerts and the child's SOS button. A Safari content-blocker extension for web filtering (Safari only). No purchases, no ads, no tracking, no third-party login.

SINGLE-DEVICE REVIEW FLOW (no second device needed):
1. Install "Prime Kids: Parent Helper" and sign in with review@parenthelper.com / ReviewTest2026! (pre-populated account; opens in Mongolian — tap "EN" at the top of the login screen for English).
2. Install this app on the same or another iPhone and enter pairing code PRIME888. It pairs instantly into the review account's demo child. The code is reusable and never expires.
3. Follow the onboarding: allow Notifications and Location ("Always" or "While Using" both work for review), authorise Screen Time (a parent's Apple ID or the device passcode; if the test device is not part of a Family Sharing group the app still works — Screen-Time-dependent items simply show "Not set up"), optionally enable the Safari extension in Settings > Safari > Extensions.
4. In the parent app you can then see the location, send "Locate", "Pause" (shields all apps on the child device when Screen Time is authorised), change schedules/limits, and unpair. On the child app, Settings > Parent settings (create any 4-digit PIN) shows the app picker and rule status.

Family Controls (Distribution) is enabled for team 2R68Z37544. Privacy policy and support pages are linked in-app under Settings > Legal.
```
- Save.

### 6. Final verification (report, don't submit)
- Reload the 1.0 page; list every remaining red/warning or "missing" item (a missing **build** is expected — I will upload it).
- Confirm: App Privacy = Published; Age Rating value; Availability = Mongolia only; Screenshots = 5; Description filled; Review info saved.
- Take a screenshot of the top of the version page for me. **Do not click "Add for Review".**

## Report format
```
1 Age rating: ___
2 Description saved: yes/no
3 Screenshots: N/5 uploaded (slot size used: ___)
4 Build: none / attached ___ | export compliance asked: yes/no
5 Review info: sign-in ___ · contact filled yes/no (source: parent app / asked you) · notes saved yes/no
6 Remaining warnings on the version page: ___
Anything unexpected / needs me: ___
```
