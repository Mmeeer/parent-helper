# Prime Kids: Child — App Privacy (nutrition labels)

Answers for App Store Connect → App Privacy. Must match `PrimeKidsChild/PrivacyInfo.xcprivacy` and the code.

**Do you or your third-party partners collect data from this app?** Yes.

| Data type | Collected | Linked to user | Tracking | Purpose | Where in code |
|---|---|---|---|---|---|
| Location → **Precise Location** | Yes | Yes | No | App Functionality | `LocationManager` → `POST /activity/sync`, `/devices/sos` |
| Identifiers → **Device ID** | Yes | Yes | No | App Functionality | pairing `deviceToken`, `deviceId`; FCM push token |
| Usage Data → **Product Interaction** | Yes | Yes | No | App Functionality | screen-time summary (limit reached, shield events), heartbeat/battery |
| Diagnostics → **Crash Data / Performance Data** | Yes | No | No | App Functionality | Firebase Messaging SDK diagnostics only (no Crashlytics/Analytics linked) |

**Not collected:** Contact info, Health, Financial, Browsing history (Safari filtering runs on-device; visited URLs are not read or uploaded), Search history, Contacts, User content, Purchases, Other data.

**Tracking:** No. No ATT prompt. `NSPrivacyTracking = false`, no tracking domains.

**Third-party SDKs:** Firebase Messaging (FCM) for push delivery — data: FCM registration token only. Firebase's own privacy manifest is bundled via SwiftPM.

**Required-reason APIs declared:** UserDefaults (`CA92.1`) in the app and each extension.

Parent-app labels are separate — see `parent-app/store-assets/ios/AppPrivacy.md`.
