# Mission: prepare "Prime Kids: Parent Helper" (iOS) for App Store review — DO NOT SUBMIT

You are operating my Mac. Your job is to get the App Store Connect listing of the **parent app** 100 % ready for review, then stop and give me a checklist. **You must never click "Add for Review", "Submit for Review", "Submit to App Review", or anything that starts the review.** I will do that myself after checking your work.

## Environment on this Mac
- One desktop/Space already has a **browser window signed in to App Store Connect, open on the app's submission section**. Use that window (switch Spaces with Control+→ / Mission Control if needed). Do not sign out. If Apple asks for a password or 2-factor code, **stop and ask me** — never type an Apple ID password.
- Project files are at `/Users/mergenganbat/Desktop/drd/parent-helper/`. Use Finder / the file chooser to pick files from there.
- If a page differs from what I describe, do the closest sensible thing and mention it in the report; don't improvise big changes.

## Project facts
| Item | Value |
|---|---|
| App | **Prime Kids: Parent Helper** — parent's control app of a parental-control system (companion child apps on Android and iPhone) |
| App Store Connect App ID | **6802229006** · bundle `com.parenthelper.parent` · Team Ulzii Uyalagt Systems LLC (2R68Z37544) |
| Version to prepare | **1.0** (1.0.0) — build to attach: **1.0.0 (5)** (uploaded via EAS; if it still says "Processing", attach the newest processed build and tell me) |
| Sister app (do NOT touch today) | Prime Kids: Child, App ID 6802229430 |
| Demo account for reviewers | email `review@parenthelper.com` · password `ReviewTest2026!` (this is a demo/reviewer account; it's fine to type it into the App Review Information form) |
| Child-app pairing code for reviewers | `PRIME888` |
| Support / marketing URL | `https://primekids.masterclass.mn/parent-helper/support.html` |
| Privacy policy URL (already set) | `https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html` |
| Support email | `ub1o1genko@gmail.com` |
| Copyright | `© 2026 Ulzii Uyalagt Systems LLC` |
| Availability | Free, **Mongolia only** (already set — verify, don't add countries) |
| Business model | No in-app purchases; access is activated with a subscription key issued by the administrator. Never write anything that suggests buying outside the app. |

## What is already done (verify, don't redo)
Categories (Lifestyle / Utilities), App Privacy **published**, subtitle, promotional text, keywords, URLs, copyright, "Manually release", Pricing = Free / Mongolia only, build 1.0.0 (4) attached (you will replace it with (5)), review "Sign-in required = Yes" + user name entered.

## Missions (in order)

### 1. Age rating
App Information (or the version page) → **Age Rating → Set Up / Edit**. Answers: every content category (violence, sexual content/nudity, profanity/crude humor, horror/fear, alcohol/tobacco/drug use, gambling, contests, medical/treatment info) = **None**; Unrestricted Web Access = **No**; Gambling = **No**; User-Generated Content = **No**; Messaging/chat = **No**; Advertising = **No**; **Parental Controls = Yes**; Age assurance = **No**; **"Social Media Disabled for Users Under 13" = Yes** (the app has no social features at all); Made for Kids = **No**. Save. Expected rating **4+** — report the result.

### 2. Version 1.0 page — text fields
Open the **1.0 Prepare for Submission** page (English (U.S.)). Verify subtitle `Family safety & screen time`, promotional text, keywords `parental control,screen time,family,location,kids,child safety,geofence,sos,web filter,monitor`, support/marketing URL, copyright. Then paste the **Description** below exactly (plain text; no markdown):

```
Prime Kids: Parent Helper is the parent's control center for the Prime Kids family-safety system. Pair it with the Prime Kids child app on your child's Android phone or iPhone and manage everything from one place.

Location & safety
• Live location on a map with history and address lookup
• Safe zones (geofences) with entry/exit alerts
• SOS alerts with the child's GPS position
• On-demand "Locate" and device status (battery, online, last seen)

Screen time & apps
• Daily screen-time limit and bedtime/school schedules
• Block apps — on Android from the installed-app list; on iPhone the apps are chosen on the child's device with Apple's Screen Time picker
• Pause the child's device (iPhone: shields all apps; Android: locks the screen)
• Approve or block newly installed apps (Android)

Web filtering
• Category-based filtering plus your own block/allow lists
• Android: all browsers and apps · iPhone: Safari via the Prime Kids extension

Reports & alerts
• Daily/weekly/monthly activity summaries
• Categorised alerts with quiet hours and per-type toggles
• English and Mongolian

Multiple children, one account. Each child has their own device, rules, filters and reports.

Account
Create an account with email and password. Access is activated with a subscription key from your administrator. You can delete your account at any time from Settings.

Privacy policy: https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html
Support: https://primekids.masterclass.mn/parent-helper/support.html
```
Save.

### 3. Screenshots (iPhone)
In the **iPhone 6.9-inch** (or "6.5-inch", whichever slot the page shows first/required) screenshot area, upload these 7 files **in this order** from `/Users/mergenganbat/Desktop/drd/parent-helper/parent-app/store-assets/screenshots/iphone-6.9/`:
`01-dashboard.png`, `02-location.png`, `03-alerts.png`, `04-screen-time.png`, `05-reports.png`, `06-web-filter.png`, `07-geofences.png`
(all 1320×2868 PNG). Drag-and-drop from Finder or use the file chooser (you may multi-select). If App Store Connect rejects the size for a 6.5-inch slot, create resized copies with Terminal: `cd /Users/mergenganbat/Desktop/drd/parent-helper/parent-app/store-assets/screenshots && mkdir -p iphone-6.5 && for f in iphone-6.9/*.png; do sips -z 2778 1284 "$f" --out "iphone-6.5/$(basename $f)" >/dev/null; done` and upload those instead. No iPad screenshots (iPhone-only app). Wait until all thumbnails finish uploading; Save.

### 4. Build
In the **Build** section remove/replace 1.0.0 (4) with **1.0.0 (5)** (select from the list; it may still be processing — if so, do the rest and come back at the end; if still not processed, leave (4) and tell me). If an **export compliance** question appears, answer **No** (only standard HTTPS encryption).

### 5. App Review Information
- Sign-in required: **Yes**. User name `review@parenthelper.com`, Password `ReviewTest2026!`.
- Contact information: First name / Last name / Phone / Email — **ask me for the name and phone number** if they aren't already filled (do not guess); email `ub1o1genko@gmail.com`.
- **Notes** — replace the field content with exactly:

```
Subscription access is activated with a key issued by the family's administrator; there is no purchase inside the app. The review account already has an active 12-month subscription.

Prime Kids: Parent Helper is the parent's control app of the Prime Kids parental-control system. Its companion, "Prime Kids: Child" (App ID 6802229430), will be submitted separately; both apps are already live on Google Play (com.parenthelper.parent / com.parenthelper.child).

The app opens in Mongolian by default (primary market). Tap the "EN" toggle at the top of the login screen (or Settings → Language) to switch to English.

SINGLE-DEVICE REVIEW FLOW:
1. Sign in with review@parenthelper.com / ReviewTest2026!. The account is pre-populated (2 children, devices, rules, alerts, location history, active subscription).
2. Optional: install "Prime Kids: Child" on the same or another iPhone and enter pairing code PRIME888 — it pairs instantly into this account's demo child. The code is reusable.
3. In the parent app you can view the child's location and history, safe zones (geofences), alerts, screen-time schedules and limits, web-filter categories, activity reports, device status; send "Locate" / "Pause"; and delete the account from Settings.

No in-app purchases, no ads, no tracking, no third-party login. Privacy policy and support pages are linked in-app under Settings.
```
- Attachment: none.
- Save.

### 6. Final verification (report, don't submit)
- Reload the 1.0 page and list every remaining red/warning marker or "missing" item App Store Connect shows.
- Confirm: App Privacy = Published; Age Rating shows a value; Availability = Mongolia only; Build = 1.0.0 (5) (or state which); Screenshots = 7 uploaded; Description filled; Review info complete (except anything you had to ask me for).
- Take a screenshot of the version page's top section (where the "Add for Review" button is) so I can see the state — **but do not click that button**.

## Report format
```
1 Age rating: ___
2 Description saved: yes/no
3 Screenshots: N/7 uploaded (slot size used: ___)
4 Build attached: 1.0.0 (___) | export compliance asked: yes/no
5 Review info: sign-in yes/no · password entered yes/no · contact name/phone: ___ · notes saved yes/no
6 Remaining warnings on the version page: ___
Anything unexpected / needs me: ___
```
