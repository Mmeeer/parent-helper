# TestFlight Beta Distribution Checklist

## Pre-Upload Requirements

### 1. Apple Developer Account
- [ ] Active Apple Developer Program membership ($99/year)
- [ ] Team ID configured in Xcode project
- [ ] Distribution certificate created (Apple Distribution)
- [ ] Provisioning profile for App Store distribution

### 2. App ID Configuration
- [x] App ID registered: `com.parenthelper.child` (2026-08-17)
- [x] Extension App IDs: `.ContentBlocker`, `.DeviceActivityMonitor`, `.ShieldConfiguration`, `.ShieldAction`
- [ ] Push Notifications capability enabled
- [ ] App Groups capability enabled (`group.com.parenthelper.child`)
- [ ] FamilyControls capability enabled (requires separate entitlement approval)

### 3. App Store Connect Setup
- [x] App record created in App Store Connect (Apple ID 6802229430, name "Prime Kids: Child")
- [x] Bundle ID selected: `com.parenthelper.child`
- [ ] Primary language: English (U.S.)
- [ ] App category: Utilities
- [x] Privacy policy URL entered: https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html
- [ ] App privacy (nutrition labels) completed (see PrivacyNutritionLabels.md)

---

## Build & Upload

### 4. Archive the App
```bash
# In Xcode:
# 1. Select "Any iOS Device (arm64)" as destination
# 2. Product > Archive
# 3. When archive completes, Organizer window opens
# 4. Click "Distribute App"
# 5. Select "App Store Connect" > "Upload"
# 6. Follow prompts to upload

# Or via command line:
xcodebuild archive \
  -project PrimeKidsChild.xcodeproj \
  -scheme PrimeKidsChild \
  -archivePath build/PrimeKidsChild.xcarchive \
  -destination "generic/platform=iOS"

xcodebuild -exportArchive \
  -archivePath build/PrimeKidsChild.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/export
```

### 5. Upload to App Store Connect
- [ ] Build uploaded via Xcode Organizer or `xcrun altool`
- [ ] Build processing complete (wait for email confirmation)
- [ ] No issues flagged by App Store Connect processing

---

## TestFlight Configuration

### 6. Internal Testing (up to 100 testers)
- [ ] Add internal testers (team members with App Store Connect access)
- [ ] Select build for internal testing
- [ ] Internal testers receive email invitation automatically
- [ ] Test core flows:
  - [ ] App launches and shows pairing screen
  - [ ] Pairing code entry works (PRIME888 against the review account)
  - [ ] Pairing with Parent Helper app succeeds
  - [ ] Location tracking activates after permission grant
  - [ ] Push notifications received
  - [ ] SOS button sends alert to parent
  - [ ] Dashboard shows correct status
  - [ ] Content Blocker extension appears in Settings → Safari → Extensions and blocks a domain from the parent's list
  - [ ] Parent settings PIN + Manage apps picker; shield appears on a selected app when "Block selected apps" is on
  - [ ] Bedtime schedule shields at start time; daily limit shields at threshold
  - [ ] Remote Pause/Resume from the parent app (with app in background — arrives via silent push / poll)
  - [ ] Unpair from parent app returns child app to pairing screen

### 7. External Testing (up to 10,000 testers)
- [ ] Submit build for Beta App Review
- [ ] Provide test information:
  - What to test: "Please test the device pairing flow with the Parent Helper
    companion app, location tracking, SOS button, and Safari Content Blocker."
  - Demo account: review@parenthelper.com / ReviewTest2026!
- [ ] Beta App Review approved
- [ ] Add external tester groups
- [ ] Send invitations to external testers
- [ ] Collect and address feedback

### 8. Beta Testing Checklist
- [ ] Test on minimum supported iOS version (16.0)
- [ ] Test on latest iOS version
- [ ] Test on multiple device sizes (iPhone SE, iPhone 15, iPhone 15 Pro Max)
- [ ] Test background location tracking (app in background for 1+ hours)
- [ ] Test push notification delivery (SOS, rule changes, geofence alerts)
- [ ] Test Content Blocker with blocked URLs in Safari
- [ ] Test FamilyControls authorization flow (requires Family Sharing)
- [ ] Test device pairing over cellular and Wi-Fi
- [ ] Test app behavior when server is unreachable
- [ ] Test battery impact over 24-hour period
- [ ] Verify no crashes in crash logs

---

## Pre-Submission Final Checks

### 9. App Store Listing
- [ ] App name and subtitle entered
- [ ] Full description written (see AppStoreMetadata.md)
- [ ] Keywords entered
- [ ] Screenshots uploaded (6.7" and 6.1" sizes)
- [ ] App icon displays correctly
- [ ] Age rating questionnaire completed (4+)
- [ ] Copyright field filled
- [ ] Review notes added (see APPLE_REVIEW_NOTES.md)

### 10. Submit for App Store Review
- [ ] All TestFlight issues resolved
- [ ] FamilyControls distribution entitlement approved by Apple
- [ ] Select build for App Store submission
- [ ] Submit for review
- [ ] Monitor review status and respond to any reviewer questions
