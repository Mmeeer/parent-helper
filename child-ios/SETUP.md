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

### 4. Configure Capabilities

In the main target's Signing & Capabilities:
- [x] Background Modes: Location updates, Background fetch, Background processing, Remote notifications
- [x] Push Notifications
- [x] App Groups: `group.com.primekids.child`
- [ ] Family Controls (requires Apple approval)

### 5. Configure Info.plist
The Info.plist is provided with:
- Background task identifiers
- Location permission descriptions
- Background modes

### 6. Required Environment

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

## Apple Review Notes

1. **FamilyControls entitlement** requires manual application at developer.apple.com
2. Apple will review the justification for parental control capabilities
3. Ensure consent flows are clear (Family Sharing requirement)
4. Privacy policy must document all data collection
5. App must clearly indicate it's a child monitoring tool
