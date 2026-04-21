# Prime Kids iOS Child App — Setup Guide

## Xcode Project Setup

This directory contains all Swift source files for the iOS child app. To create the Xcode project:

### 1. Create Xcode Project
1. Open Xcode > File > New > Project > iOS > App
2. Product Name: `PrimeKidsChild`
3. Bundle Identifier: `com.primekids.child`
4. Language: Swift, Interface: SwiftUI
5. Deployment Target: iOS 16.0
6. Save in the `child-ios/` directory

### 2. Add Source Files
Drag all folders into the Xcode project:
- `PrimeKidsChild/` (main app target)
- `ContentBlocker/` (extension target)

### 3. Add Extension Targets

**Content Blocker Extension:**
1. File > New > Target > Content Blocker Extension
2. Product Name: `ContentBlocker`
3. Bundle ID: `com.primekids.child.ContentBlocker`
4. Replace generated files with the ones in `ContentBlocker/`

**DeviceActivityMonitor Extension (Phase 3):**
1. File > New > Target > Device Activity Monitor Extension
2. Product Name: `DeviceActivityMonitor`
3. Requires FamilyControls entitlement from Apple

### 4. Configure Entitlements

Entitlements files are provided in the repository:

**Main App Target:**
- Add `PrimeKidsChild/PrimeKidsChild.entitlements` to the main target
- In Build Settings > Code Signing Entitlements, set to `PrimeKidsChild/PrimeKidsChild.entitlements`

**Content Blocker Extension:**
- Add `ContentBlocker/ContentBlocker.entitlements` to the extension target
- In Build Settings > Code Signing Entitlements, set to `ContentBlocker/ContentBlocker.entitlements`

### 5. Configure Capabilities

In the main target's Signing & Capabilities:
- [x] Background Modes: Location updates, Background fetch, Background processing, Remote notifications
- [x] Push Notifications
- [x] App Groups: `group.com.primekids.child`
- [ ] Family Controls (requires Apple approval — see `FamilyControlsEntitlement.md`)

### 6. Configure Info.plist
The Info.plist is provided with:
- Background task identifiers
- Location permission descriptions
- Background modes
- App Transport Security (ATS) — enforced (no arbitrary loads)
- Export compliance (no non-exempt encryption)
- URL scheme: `primekids-child`

### 7. Required Environment

Set the server URL before building:
- In `PrefsManager.swift`, update the default `serverURL`
- Or the user can configure it during pairing

## Architecture

```
PrimeKidsChild/
├── App/                    # App entry point + AppDelegate
├── Views/                  # SwiftUI views (Pairing, Dashboard, SOS)
├── Services/               # API client, location, WebSocket, notifications
├── Monitoring/             # Rule management, screen time, background tasks
├── Storage/                # Keychain + UserDefaults managers
├── Models/                 # Codable data models
└── Assets.xcassets/        # Colors, icons

ContentBlocker/             # Safari Content Blocker extension
```

## Feature Matrix: iOS vs Android

| Feature | Android | iOS | Notes |
|---------|---------|-----|-------|
| Device Pairing | Yes | Yes | Identical flow |
| Location Tracking | Yes | Yes | CLLocationManager with Always auth |
| Heartbeat | Yes | Yes | BGAppRefreshTask every ~15 min |
| Activity Sync | Yes | Yes | BGProcessingTask every ~15 min |
| SOS Button | Yes | Yes | Hold-to-activate with GPS |
| Push Notifications | FCM | APNs via FCM | Backend routes FCM to APNs |
| WebSocket Commands | Yes | Yes | URLSessionWebSocketTask |
| App Blocking | DevicePolicyManager | FamilyControls | Requires Apple entitlement |
| Screen Time Limits | UsageStatsManager | FamilyControls | Limited on iOS |
| VPN Web Filter | Yes | No | Apple blocks VPN for parental apps |
| Safari Content Blocker | N/A | Yes | Safari only, static rules |
| Boot Auto-Start | Yes | No | iOS limitation |
| Installed Apps List | Yes | No | iOS privacy restriction |
| App Install Monitor | Yes | No | iOS privacy restriction |
| Lock Screen Overlay | Yes | No | iOS doesn't allow overlays |

## App Store Submission

See the following documents for App Store release preparation:
- `FamilyControlsEntitlement.md` — How to apply for the FamilyControls entitlement
- `AppStoreMetadata.md` — App Store listing content (description, keywords, screenshots)
- `PrivacyNutritionLabels.md` — Privacy nutrition label declarations
- `APPLE_REVIEW_NOTES.md` — Detailed notes for the Apple review team
- `TestFlightChecklist.md` — TestFlight beta testing checklist
- `ExportOptions.plist` — Archive export configuration for App Store upload
