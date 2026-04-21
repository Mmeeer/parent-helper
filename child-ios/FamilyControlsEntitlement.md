# FamilyControls Entitlement Application Guide

## Overview

Apple requires a **manual review** before granting the FamilyControls entitlement.
This entitlement is restricted to legitimate parental control and device
management applications.

Apply at: https://developer.apple.com/contact/request/family-controls-distribution

---

## Application Form — Suggested Responses

### App Name
Prime Kids

### Bundle ID
com.primekids.child

### App Description
Prime Kids is a parental control companion app installed on a child's iOS
device. It works with the Prime Kids: Parent Helper app (installed on the
parent's device) to provide real-time location tracking, screen time management,
web content filtering, and emergency SOS alerts. The app uses FamilyControls
to monitor and restrict app usage on the child's device as configured by the
parent/guardian.

### How does your app use Family Controls?

1. **AuthorizationCenter** — We request `.individual` authorization during the
   device pairing process. The parent/guardian must authenticate with their
   Apple ID (Family Sharing) to grant authorization. The child cannot self-authorize.

2. **DeviceActivityMonitor** — We use a DeviceActivityMonitor extension to track
   app usage durations and report them to the parent via our backend API. This
   allows parents to view daily and weekly screen time reports.

3. **ManagedSettings** — We use ManagedSettingsStore to:
   - Block specific apps or app categories when screen time limits are exceeded
   - Apply time-based restrictions (e.g., no apps after bedtime)
   - Shield blocked applications with a parent-friendly explanation screen

4. **DeviceActivityReport** — We use DeviceActivityReport to generate on-device
   usage summaries that are sent to the parent's companion app.

### Why can't you use Screen Time APIs or other alternatives?

Screen Time settings are user-facing and can be bypassed by the child. For a
parental control app to be effective, it must enforce restrictions that the child
cannot disable. FamilyControls is the only Apple-sanctioned API that provides
this level of enforcement through the Family Sharing authorization model.

### Target Audience
Parents and guardians of children aged 4-17 who want to monitor and manage
their child's iOS device usage for safety purposes.

### Privacy & Data Handling
- All screen time and app usage data is encrypted in transit (TLS) and at rest
- Data is only accessible to the paired parent/guardian
- No data is sold or shared with advertisers or data brokers
- Full privacy policy: https://parenthelper.com/legal/privacy-policy.html
- COPPA compliant

---

## Required Capabilities Checklist

When configuring the App ID in the Apple Developer Portal:

- [x] **Push Notifications** — For SOS alerts, rule updates, and device status
- [x] **Background Modes** — Location updates, Background fetch, Background processing, Remote notifications
- [x] **App Groups** — `group.com.primekids.child` (shared data between main app and Content Blocker extension)
- [x] **Family Controls** — Screen time monitoring and app restriction enforcement
- [x] **Content Blocker** — Safari web content filtering extension

---

## App ID Configuration (developer.apple.com)

1. Go to Certificates, Identifiers & Profiles > Identifiers
2. Create or edit App ID: `com.primekids.child`
3. Enable capabilities:
   - App Groups
   - Family Controls
   - Push Notifications
   - Background Modes (configured in Info.plist, not in portal)
4. Create extension App ID: `com.primekids.child.ContentBlocker`
5. Enable capabilities for extension:
   - App Groups (same group: `group.com.primekids.child`)

---

## Timeline

- FamilyControls entitlement review typically takes **2-4 weeks**
- Submit the entitlement request BEFORE submitting the app for App Store review
- You can develop and test using the **development** FamilyControls entitlement
  (available without approval) while waiting for the **distribution** entitlement
