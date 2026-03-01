# Parental Control App — Functional Overview

> **Purpose:** This document serves as a reference for AI assistants when working on any component of this project. It describes the system architecture, each component's responsibilities, how they communicate, data models, and development priorities.

---

## Project Structure & Tech Stack

| Component | Technology | Status |
|-----------|-----------|--------|
| **Child App (Android)** | Native Kotlin | Active development |
| **Parent App** | React Native (cross-platform) | Active development |
| **Backend API** | Node.js + Express + MongoDB | Active development |
| **Admin Panel** | Nuxt (latest) + Tailwind CSS | Active development |
| **Child App (iOS)** | Swift (Screen Time API) | Deferred — pending MacBook |

---

## 1. Child App (Android — Kotlin)

Runs as a persistent background service on the child's device. Requires deep OS-level access — **must be native Kotlin**, not cross-platform.

### Core Responsibilities
- **Screen Time Tracking:** Monitor foreground app usage via `UsageStatsManager`. Enforce daily/per-app limits and schedules by displaying a lock-screen overlay when limits are reached.
- **App Monitoring & Blocking:** Use `DevicePolicyManager.setPackagesSuspended()` to block apps. Detect new app installs and report to backend for parent approval.
- **Web Content Filtering:** Run a local VPN via `VpnService` to intercept DNS/HTTP requests. Check against a categorized domain filter database (adult, gambling, violence, etc.) plus parent-defined blocklist/allowlist.
- **Location Reporting:** Use Google Fused Location Provider for periodic GPS updates. Support geofence entry/exit events.
- **Activity Data Collection:** Log app usage durations, visited URLs, blocked attempts, and search queries. Sync to backend periodically and on-demand.
- **Anti-Bypass Protection:** Enable Device Admin to prevent uninstallation. Auto-restart on boot (`RECEIVE_BOOT_COMPLETED`). Detect VPN apps that could bypass filtering. Alert on factory reset attempts.

### Key Android Permissions
`USAGE_STATS`, `DEVICE_ADMIN`, `BIND_VPN_SERVICE`, `BIND_ACCESSIBILITY_SERVICE`, `ACCESS_FINE_LOCATION`, `FOREGROUND_SERVICE`, `SYSTEM_ALERT_WINDOW`, `RECEIVE_BOOT_COMPLETED`

### Communication with Backend
- REST API for syncing rules, uploading activity logs, and registering the device.
- WebSocket connection for real-time rule pushes and remote commands (e.g., instant lock).
- FCM (Firebase Cloud Messaging) for push notifications when the app is in the background.

---

## 2. Parent App (React Native)

The parent-facing dashboard for monitoring and controlling children's devices. Cross-platform (Android + iOS).

### Core Responsibilities
- **Dashboard:** Display daily/weekly/monthly screen time charts, top apps, usage trends, and recent activity.
- **Rule Management:** Set screen time limits (daily totals + per-app), define schedules (e.g., no phone 8am–3pm), manage app blocklist/allowlist, and configure web filter categories.
- **Location Tracking:** Real-time map view of child's location, location history trail, and geofence management (add/edit zones like "School" or "Home" with entry/exit alerts).
- **App Approval Flow:** Receive notifications when child installs a new app. Approve or block remotely.
- **Alerts & Notifications:** View and manage all alerts — screen time limits reached, blocked content attempts, geofence events, unusual usage patterns, uninstall attempts.
- **Child Device Management:** Pair/unpair child devices, view device status (online/offline, battery), send remote commands (lock device, trigger location update).
- **Reports:** Daily summary view, weekly digest, per-child activity breakdown.

### Communication with Backend
- REST API for all CRUD operations (rules, devices, children profiles).
- WebSocket for real-time updates (live location, instant alerts, device status changes).
- Push notifications via FCM (Android) and APNS (iOS).

---

## 3. Backend API (Node.js + Express + MongoDB)

Central server that connects all clients, stores data, processes rules, and delivers alerts.

### Core Modules
- **Auth & User Management:** JWT-based authentication. OAuth 2.0 social login. Parent accounts, child profiles, device registration. Password reset, email verification.
- **Rules Engine:** Store and distribute parental rules (screen time limits, schedules, app blocks, web filters). Push rule changes to child devices in real-time via WebSocket/FCM.
- **Activity Logging:** Receive and store activity data from child devices (app usage, web visits, location, blocked attempts). Aggregate data for reports.
- **Alert Engine:** Process incoming events and generate smart alerts. Types: limit reached, new app installed, blocked content, geofence trigger, device offline, unusual patterns. Deliver via push notification + store in notification center.
- **Content Filter Database:** Maintain categorized domain lists. Support parent custom blocklist/allowlist. Sync filter updates to child devices.
- **Push Notification Service:** FCM for Android, APNS for iOS. Queue and deliver alerts to parent devices.

### Key API Endpoints

**Auth**
- `POST /auth/register` — Create parent account
- `POST /auth/login` — Login, returns JWT
- `POST /auth/refresh` — Refresh token

**Children**
- `POST /children` — Add child profile
- `GET /children` — List all children for parent
- `PUT /children/:id` — Update child profile
- `DELETE /children/:id` — Remove child profile

**Devices**
- `POST /devices/pair` — Pair a child device (generates pairing code)
- `GET /devices/:id/status` — Device status (online, battery, last sync)
- `POST /devices/:id/command` — Send remote command (lock, locate, sync)

**Rules**
- `GET /rules/:childId` — Get all rules for a child (consumed by child app)
- `PUT /rules/:childId/screen-time` — Set screen time limits & schedules
- `PUT /rules/:childId/apps` — Set app blocklist/allowlist
- `PUT /rules/:childId/web-filter` — Set web filter categories & custom domains

**Activity & Reports**
- `POST /activity/sync` — Child device uploads activity batch
- `GET /activity/:childId/summary` — Daily/weekly summary
- `GET /activity/:childId/apps` — App usage breakdown
- `GET /activity/:childId/web` — Web browsing history
- `GET /activity/:childId/location` — Location history

**Alerts**
- `GET /alerts` — List alerts for parent
- `PUT /alerts/:id/read` — Mark alert as read
- `POST /alerts/settings` — Configure alert preferences

**App Approval**
- `GET /approvals/pending` — List apps awaiting approval
- `PUT /approvals/:id` — Approve or block app

### Data Models

**User (Parent)**
```
{ email, passwordHash, name, plan, children[], devices[], createdAt }
```

**Child**
```
{ name, age, parentId, deviceIds[], rules{}, avatar, createdAt }
```

**Device**
```
{ childId, platform, model, osVersion, pairingCode, status, lastSeen, batteryLevel, appVersion }
```

**Rules**
```
{ childId, screenTime{ dailyLimitMin, perApp[{appId, limitMin}], schedule[{days, startTime, endTime}] }, blockedApps[], webFilter{ categories[], customBlock[], customAllow[] } }
```

**ActivityLog**
```
{ childId, deviceId, date, apps[{packageName, durationMin}], web[{url, timestamp, blocked}], location[{lat, lng, timestamp}], blockedAttempts[] }
```

**Alert**
```
{ parentId, childId, type, message, data{}, read, createdAt }
```

---

## 4. Admin Panel (Nuxt + Tailwind CSS)

Internal web dashboard for managing the platform. Built with the latest version of Nuxt and styled with Tailwind CSS.

### Core Responsibilities
- **User Management:** View/search/edit parent accounts. Suspend or delete accounts. View subscription status.
- **Subscription & Billing:** Monitor plan distribution (Free / Premium / Family). Manage pricing tiers. View revenue metrics.
- **Content Filter Management:** Manage the master domain categorization database. Review and process user-submitted domain reports. Add/remove domains from categories.
- **Analytics Dashboard:** Active users (DAU/MAU), new registrations, churn rate, device pairings, alert volumes, feature usage breakdown.
- **Support Tools:** View user activity for debugging. Impersonate parent accounts (read-only). Manage reported issues.
- **System Health:** API response times, error rates, push notification delivery stats, background service health.

### Communication with Backend
- Consumes the same Node.js API (with admin-scoped JWT tokens and elevated permissions).
- Dedicated admin endpoints: `GET /admin/users`, `GET /admin/analytics`, `PUT /admin/filters`, etc.

---

## 5. Component Communication Map

```
┌─────────────┐     REST + WebSocket + FCM     ┌─────────────────┐
│  Child App   │◄──────────────────────────────►│                 │
│  (Kotlin)    │   sync rules, upload activity  │                 │
└─────────────┘   push commands, real-time      │                 │
                                                │   Backend API   │
┌─────────────┐     REST + WebSocket + Push     │   (Node.js +    │
│  Parent App  │◄──────────────────────────────►│    MongoDB)     │
│  (React      │   CRUD rules, view reports,    │                 │
│   Native)    │   real-time alerts & location   │                 │
└─────────────┘                                 │                 │
                                                │                 │
┌─────────────┐     REST (admin JWT)            │                 │
│  Admin Panel │◄──────────────────────────────►│                 │
│  (Nuxt)      │   user mgmt, analytics,        │                 │
└─────────────┘   filter DB, support            └─────────────────┘
```

**Real-time flows:**
- Rule change: Parent App → API → WebSocket/FCM → Child App (instant enforcement)
- Location update: Child App → API → WebSocket → Parent App (live map)
- Alert: Child App → API → Alert Engine → Push + WebSocket → Parent App

---

## 6. Development Phases

### Phase 1 — MVP (3–4 months) — Android Only
**Goal:** Working end-to-end product with core parental controls.

1. **Backend API:** Auth, child/device management, rules CRUD, activity sync, basic alerts, push notifications.
2. **Child App (Kotlin):** Background service, screen time tracking & enforcement, app blocking (Device Admin), basic DNS-based web filtering, GPS location reporting, anti-uninstall protection.
3. **Parent App (React Native):** Dashboard with usage charts, rule setting UI, location map, app approval flow, alert notifications, onboarding & device pairing.
4. **Admin Panel (Nuxt):** User management, basic analytics, content filter DB management.
5. **Launch:** Google Play Store submission (prepare for Device Admin / VPN permission review).

### Phase 2 — Expansion (2–3 months)
- Geofencing (parent defines zones, child app reports entry/exit)
- Advanced VPN-based web filtering with category database
- Smart alerts (unusual patterns, late-night usage, usage spikes)
- Weekly email digest reports
- Admin panel: subscription management, support tools

### Phase 3 — Differentiation (2–3 months)
- iOS child app (Swift, Screen Time API) — requires MacBook
- Social media monitoring (Android, via Accessibility Service / notification reading)
- AI-powered content analysis (NLP on search queries for cyberbullying/self-harm keywords)
- Family group management (multiple children per parent)
- YouTube monitoring
- Emergency / panic button

---

## 7. Key Constraints & Notes

- **Child app must be native.** React Native / Flutter cannot access `UsageStatsManager`, `DevicePolicyManager`, `VpnService`, or `AccessibilityService` at the depth required.
- **iOS child app is deferred.** Will be built in Swift using Apple's Screen Time API (`FamilyControls`, `ManagedSettings`, `DeviceActivity`) once a MacBook is available. iOS has significant limitations vs Android (no call/SMS monitoring, weaker anti-bypass, opaque app tokens).
- **Google Play compliance.** Apps using Device Admin, Accessibility, and VPN permissions require special policy declarations and face stricter review.
- **Legal compliance.** Must comply with COPPA (parental consent for children under 13), GDPR if targeting EU. All data encrypted in transit (TLS) and at rest.
- **Monetization.** Freemium + subscription model: Free (1 device, basic features), Premium ($4.99/mo — 5 devices, full features), Family ($7.99/mo — 10 devices, AI alerts).
