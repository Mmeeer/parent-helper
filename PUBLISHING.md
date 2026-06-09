# Publishing Guide — Google Play (Production)

Scope: **child** (native Kotlin) and **parent-app** (Expo/React Native) → Google Play, production track.
iOS is intentionally out of scope for now.

---

## ✅ Done in the repo (by this prep pass)

### child (native Android)
- **Upload keystore generated**: `child/app/upload-keystore.jks`
  - Alias: `upload` · Validity: ~27 years
  - **SHA-256**: `B4:93:28:1A:8B:84:9B:AF:7F:A3:B2:78:F3:0C:BB:0D:D1:3D:26:7A:B1:84:B3:0C:EE:55:90:AB:55:6E:88:80`
- **Signing wired** into `child/app/build.gradle.kts` via gitignored `child/keystore.properties`
  (template committed as `child/keystore.properties.example`).
- **Fixed a release-blocking Metaspace OOM** in `child/gradle.properties`
  (`:app:packageReleaseBundle` failed; bumped JVM to `-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+UseG1GC`).
- `.gitignore` hardened: `keystore.properties`, `*.jks`, `*.keystore` (debug.keystore excepted).
- **Verified**: `./gradlew :app:bundleRelease` → signed `app-release.aab` (15.4 MB), signature matches the upload key above.

### parent-app (Expo/EAS)
- `eas.json` `production` now builds **`app-bundle`** (was `apk` — Play requires AAB), with `autoIncrement` and `appVersionSource: remote`.
- `submit.production.android` scaffolded (`track: production`, `releaseStatus: draft`).
- `.gitignore`: `google-play-service-account.json` ignored.

---

## 🔴 CRITICAL — back up the upload key NOW

`child/app/upload-keystore.jks` + `child/keystore.properties` are **git-ignored and exist only on this machine**.
The password is stored only in `child/keystore.properties`. Copy **both files** to secure offline storage
(password manager / encrypted backup). Without them you cannot ship updates to the child app.
(With Play App Signing enabled, a lost *upload* key is recoverable via Play support; still — back it up.)

---

## ⚠️ Production policy risk — child app sensitive permissions

The child app requests permissions Google reviews **very strictly** for production:
`BIND_ACCESSIBILITY_SERVICE`, `BIND_VPN_SERVICE`, `BIND_DEVICE_ADMIN`, `QUERY_ALL_PACKAGES`,
`ACCESS_BACKGROUND_LOCATION`, `PACKAGE_USAGE_STATS`, `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE_SPECIAL_USE`.

These are high-rejection-rate without proper handling. Before/at submission you must:
- Position the app under Google Play's **parental control / family** use case and complete the
  **Permissions Declaration Form** for each sensitive permission (accessibility, VPN, all-files/all-packages,
  background location — the latter typically needs a screen-recorded demo).
- Provide a **Privacy Policy URL** (mandatory; especially for monitoring + location + child data).
- Complete the **Data safety** form (declare location, app activity, device IDs collected).
- Complete **Content rating** and **Target audience & content** (this is a child-monitoring app).
- Provide **App access** test credentials + pairing instructions for the review team.

> Expect this app to need a written justification and possibly multiple review rounds. Consider
> launching on **internal/closed testing first** even though production is the goal.

## ⚠️ Other pre-publish concerns (not blockers, but address before public launch)
- **Cleartext HTTP backend**: `SERVER_URL` defaults to `http://139.59.107.13/parent-helper/`
  (raw IP, no TLS). Child location/credentials over unencrypted HTTP is a serious risk for a
  production parental app — move backend to HTTPS + a domain before public release.
- **Hardcoded Google Maps API key** in `parent-app/app.json`. Restrict it in Google Cloud Console
  to the Android package `com.parenthelper.parent` + the release signing SHA-1, or rotate it.

---

## Google Play Console — VpnService Declaration Form

Navigate to **Policy and programs → App content → VpnService** (or Declarations → VpnService).

Fill in all fields exactly:

| Field | Answer |
|-------|--------|
| **Does your app use VpnService?** | Yes |
| **What does your app use VpnService for?** | Content filtering / parental controls — DNS-level web filtering to block inappropriate content categories for child safety |
| **Does your app tunnel device traffic through a VPN connection to a remote server?** | No |
| **Detailed description of VpnService functionality** | Prime Kids Child is a parental control app. It uses Android's VpnService to create a local VPN tunnel on the child's device for DNS-based web content filtering. The VPN intercepts DNS queries (UDP port 53) and checks requested domains against parent-configured blocked categories (adult, gambling, violence, drugs, weapons, hate, malware, phishing). Blocked domains receive an NXDOMAIN response locally on the device. Allowed DNS queries are forwarded to Google's public DNS servers (8.8.8.8 / 8.8.4.4). No user browsing data, web page content, or DNS query logs are transmitted to any third-party server. The VPN operates entirely on-device for the sole purpose of protecting children from inappropriate web content. The parent controls which categories are blocked via the companion Parent Helper app. An in-app disclosure screen explains VPN usage to the parent before VpnService.prepare() is called. |
| **Privacy policy URL** | https://primekids.masterclass.mn/parent-helper/legal/privacy-policy (see sections 3.4 and 3.6 for VPN details) |

### Foreground Service Declaration (`specialUse`)

Navigate to **Policy and programs → App content → Foreground service**.

Declare both foreground services:

| Service | `foregroundServiceType` | Justification |
|---------|------------------------|---------------|
| `MonitoringService` | `location\|specialUse` | Background location tracking for child safety (geofence alerts) + parental control enforcement (app blocking, screen-time limits) |
| `WebFilterVpnService` | `specialUse` | On-device DNS-based web content filtering for child safety — blocks inappropriate domains locally using VpnService |

### Target Audience & Content

Ensure the **Target audience and content** section declares:
- The app is designed for **parents** (not children directly) — the child app is installed by parents
- App is used in a **parental control / family safety** context
- VPN usage is consistent with the Families policy (child safety, not data collection)

---

## Remaining manual steps

### A. child → Google Play
1. Create app in **Play Console** (package `com.parenthelper.child`), opt into **Play App Signing**.
2. Build the AAB locally (already verified working):
   ```
   cd child
   JAVA_HOME="C:\Program Files\Android\Android Studio\jbr" ./gradlew :app:bundleRelease
   ```
   Output: `child/app/build/outputs/bundle/release/app-release.aab`
3. Upload the AAB to the chosen track; complete the declarations/forms above.
4. For updates, bump `versionCode` (and `versionName`) in `child/app/build.gradle.kts`.

### B. parent-app → Google Play (EAS)
1. Create a **Google Play service account** (Play Console → API access), grant release permissions,
   download the JSON to `parent-app/google-play-service-account.json` (git-ignored).
2. Build (EAS manages the keystore in the cloud; first build will prompt to generate it):
   ```
   cd parent-app
   eas build --platform android --profile production
   ```
3. Submit:
   ```
   eas submit --platform android --profile production
   ```
   `releaseStatus: draft` means it lands as a draft in Play Console for you to review before going live.

---

## Build environment note
Local Gradle builds require **JDK 17+**. The shell defaults to JDK 11, so set
`JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"` (JDK 21) for any `./gradlew` invocation.
