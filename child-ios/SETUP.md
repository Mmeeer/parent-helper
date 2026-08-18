# Prime Kids iOS Child App — Setup Guide

Native SwiftUI app (iOS 16+) with four app extensions. The Xcode project is **generated from `project.yml`** with [XcodeGen](https://github.com/yonaskolb/XcodeGen) so it stays reproducible and diff-friendly.

## Requirements

- macOS 15+, **Xcode 26** (iOS 26 SDK; the iOS platform component must be installed: Xcode → Settings → Components, or `xcodebuild -downloadPlatform iOS`)
- `brew install xcodegen`
- Apple Developer team **2R68Z37544** (Ulzii Uyalagt Systems LLC) added in Xcode → Settings → Accounts
- A physical iPhone on iOS 16+ — Family Controls, shields and Safari extensions do **not** work in the Simulator

## Generate & open

```sh
cd child-ios
xcodegen generate            # writes PrimeKidsChild.xcodeproj
open PrimeKidsChild.xcodeproj
```

Re-run `xcodegen generate` whenever you add/remove files or edit `project.yml`. Do not hand-edit target settings in Xcode — put them in `project.yml` / `Config/*.xcconfig`.

## Targets

| Target | Bundle ID | Purpose |
|---|---|---|
| `PrimeKidsChild` | `com.parenthelper.child` | Main app (pairing, location, SOS, rules, Screen Time integration) |
| `ContentBlocker` | `…child.ContentBlocker` | Safari content blocker fed by `ContentBlockerService` |
| `DeviceActivityMonitorExtension` | `…child.DeviceActivityMonitor` | Applies shields at schedule boundaries / daily-limit threshold |
| `ShieldConfigurationExtension` | `…child.ShieldConfiguration` | Branded, bilingual shield UI |
| `ShieldActionExtension` | `…child.ShieldAction` | "Close" / "Ask parent" buttons on the shield |

All targets share App Group **`group.com.parenthelper.child`** (`Shared/AppGroup.swift`) — extensions read state/selection from its `UserDefaults` suite; the Keychain uses it as access group.

## Configuration

- `Config/Shared.xcconfig` — team, deployment target, versions (`MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`).
- `Config/Debug.xcconfig` / `Release.xcconfig` — `PK_SERVER_URL` (→ `Info.plist` `PKServerURL` → `AppConfig.defaultServerURL`). Default: `https://primekids.masterclass.mn/parent-helper`.
- `PrimeKidsChild/GoogleService-Info.plist` — Firebase iOS app `com.parenthelper.child` (Messaging only; APNs → FCM token → backend `POST /devices/push-token`).
- Entitlements: `aps-environment` is `development` in the file; Xcode switches it to `production` when exporting for App Store.

## Capabilities (already in entitlements; must also be enabled on the App IDs)

Main app: Family Controls, App Groups, Push Notifications, Time Sensitive Notifications, Background Modes (location, fetch, processing, remote-notification).
Family Controls extensions: Family Controls, App Groups. Content blocker: App Groups.

Family Controls **(Distribution)** requires Apple's approval (requested 2026-08-17, team-level). Until then, development builds work on your own devices.

## Build from the command line

```sh
xcodebuild -resolvePackageDependencies -project PrimeKidsChild.xcodeproj -scheme PrimeKidsChild
xcodebuild build -project PrimeKidsChild.xcodeproj -scheme PrimeKidsChild -destination 'generic/platform=iOS'
# Archive + export for App Store Connect (see TestFlightChecklist.md):
xcodebuild archive -project PrimeKidsChild.xcodeproj -scheme PrimeKidsChild -destination 'generic/platform=iOS' -archivePath build/PrimeKidsChild.xcarchive
xcodebuild -exportArchive -archivePath build/PrimeKidsChild.xcarchive -exportOptionsPlist ExportOptions.plist -exportPath build/export
```

## Architecture

```
PrimeKidsChild/
├── App/            PrimeKidsChildApp (root), AppDelegate (Firebase, BGTasks, push)
├── Views/          PairingView, DashboardView, SOSButton
├── Services/       APIClient, LocationManager, WebSocketManager (Socket.IO v4), NotificationManager (FCM),
│                   ContentBlockerService, CommandHandler (sync/locate/lock/unlock/unpair)
├── Monitoring/     RuleManager, ScreenTimeManager (FamilyControls/ManagedSettings/DeviceActivity),
│                   ActivitySyncService, BackgroundTaskManager
├── Storage/        PrefsManager (App Group defaults), KeychainManager (shared access group)
├── Models/         Codable API models
├── Assets.xcassets, Info.plist, PrivacyInfo.xcprivacy, PrimeKidsChild.entitlements
Shared/             AppGroup/SharedKeys, AppConfig, extension privacy manifest
ContentBlocker/ DeviceActivityMonitorExtension/ ShieldConfigurationExtension/ ShieldActionExtension/
Config/             xcconfigs      project.yml   ExportOptions.plist
```

## Feature matrix: iOS vs Android

| Feature | Android | iOS | Notes |
|---|---|---|---|
| Device pairing (code) | Yes | Yes | Same backend flow |
| Location tracking | Yes | Yes | CLLocationManager, Always auth, significant-change in background |
| Heartbeat / activity sync | Yes | Yes | BGAppRefresh / BGProcessing (~15 min, iOS-scheduled) |
| SOS button | Yes | Yes | Hold-to-send with GPS |
| Push | FCM | FCM via APNs | Same backend send path |
| Realtime commands | Socket.IO | Socket.IO (foreground) + FCM silent push | Backend B2/B3 |
| App blocking | DevicePolicyManager | FamilyControls shields on parent-picked selection | Selection made on the child device |
| Schedules / daily limit | Yes | Yes (DeviceActivity + shields) | Apple's shield UI, branded |
| Remote lock | Full-screen lock | **Pause** = shield all apps | iOS cannot lock the device |
| Web filter | VPN (all browsers) | Safari content blocker + Apple adult filter | Safari/WebKit only |
| Installed apps list / install alerts | Yes | No | iOS privacy sandbox |
| Browsing history | Yes | No | No API |
| Anti-uninstall | Yes | No | Use Screen Time "Deleting Apps" restriction |
| Boot auto-start | Yes | Partial | Significant-change location relaunches the app |

## App Store submission docs

`FamilyControlsEntitlement.md`, `FamilyControlsRequestForms.md`, `AppStoreMetadata.md`, `PrivacyNutritionLabels.md`, `APPLE_REVIEW_NOTES.md`, `TestFlightChecklist.md`, `ExportOptions.plist`. Overall plan: [../IOS_SUBMISSION_PLAN.md](../IOS_SUBMISSION_PLAN.md).
