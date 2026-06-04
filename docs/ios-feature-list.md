# Prime Kids — iOS Feature List

> **For the marketing team** — What's available on iOS, what's different from Android, and why.

---

## Quick Comparison Table

| Feature | Android | iOS |
|---------|---------|-----|
| Screen time limits | ✅ Full control | ⚠️ Via Apple Screen Time |
| Per-app time limits | ✅ Full control | ⚠️ Limited (Apple controls the UI) |
| Scheduled device-off periods | ✅ Full control | ⚠️ Via Apple Screen Time |
| App blocking | ✅ Full (with app icons and names) | ⚠️ Via Family Controls (no app list visible) |
| Web filtering (all browsers) | ✅ All browsers and apps | ❌ Safari only |
| Location tracking | ✅ | ✅ |
| Geofencing (safe zones) | ✅ | ✅ |
| SOS emergency button | ✅ | ✅ |
| App install alerts | ✅ Automatic detection | ❌ Not possible on iOS |
| Remote lock | ✅ Full lock screen | ❌ Not possible on iOS |
| Remote unlock | ✅ | ❌ Not possible on iOS |
| Activity reports | ✅ | ✅ |
| Browsing history | ✅ All browsers | ❌ Not possible on iOS |
| Anti-uninstall protection | ✅ Cannot be removed | ❌ Child can delete the app |
| Always-on background service | ✅ Runs 24/7 | ⚠️ iOS manages battery life (periodic refresh) |
| Full installed apps list | ✅ With icons | ❌ Not possible on iOS |
| Lock screen overlay | ✅ Custom full-screen block | ❌ Apple's built-in shield UI only |
| Bilingual (EN/MN) | ✅ | ✅ |
| Multi-child support | ✅ | ✅ |
| Push notifications | ✅ | ✅ |
| Device pairing | ✅ | ✅ |
| Sign in with Apple | ❌ | ✅ iOS exclusive |

---

## Features Available on iOS (Same as Android) ✅

These features work the same way on both platforms:

- **Real-time location tracking** — See the child's current location on a map with movement history and address lookup.
- **Geofencing with entry/exit alerts** — Create safe zones around home, school, or other locations and get notified when the child enters or leaves.
- **SOS emergency button with GPS** — The child holds the SOS button to instantly alert the parent with their GPS location.
- **Push notifications and smart alerts** — Receive categorized alerts for important events.
- **Remote locate** — Request the child's current GPS position on demand.
- **Activity syncing and reports** — View screen time summaries, usage charts, and activity breakdowns by day, week, or month.
- **Device pairing** — Simple pairing code flow to connect the child's device.
- **Multi-child support** — Manage multiple children from one account, each with their own rules and device.
- **Bilingual (English and Mongolian)** — Full language support, switchable anytime.
- **Subscription activation** — Same PK-XXXX-XXXX key code activation.
- **Full parent app** — The same parent app works for managing both Android and iOS children.

---

## Features with Limitations on iOS ⚠️

These features are available but work differently due to Apple's platform policies:

### Screen Time Limits
Available through Apple's Screen Time framework, but the parent cannot fully control the enforcement experience. Apple provides its own built-in screen time UI — we can set limits, but Apple decides how to display and enforce them. On Android, Prime Kids shows its own friendly lock screen; on iOS, Apple shows its standard shield.

### Per-App Time Limits
Parents can restrict specific apps, but Apple's Family Controls uses a privacy-preserving app picker — the parent selects apps from Apple's interface rather than seeing a full list with icons and names like on Android.

### App Blocking
Parents can block apps using Apple's Family Controls system. However, we cannot show the full list of installed apps with icons and usage data like on Android — Apple's privacy rules prevent any app from seeing what other apps are installed.

### Scheduled Device-Off Periods
Available through Apple's Screen Time scheduling, but Apple controls the enforcement UI rather than Prime Kids showing its own block screen.

### Background Activity Monitoring
Works, but iOS manages battery life more aggressively than Android. Activity data is synced during periodic background refresh windows (approximately every 15 minutes) rather than continuously. Location updates may also be slightly less frequent to preserve battery.

---

## Features NOT Available on iOS ❌

These features cannot be offered on iOS due to Apple's platform restrictions:

### Web Content Filtering Across All Browsers
On Android, Prime Kids filters all internet traffic at the network level, blocking harmful websites in every browser and app. Apple does not allow this approach. On iOS, we can only provide a **Safari Content Blocker** — it works in Safari but does **not** cover Chrome, Firefox, or in-app browsers. Parents should set Safari as the default browser on the child's device for best protection.

### Full Installed Apps List
Apple's privacy sandbox prevents any app from seeing what other apps are installed on the device. On Android, parents see a complete list with icons and usage data; on iOS, this is not possible.

### New App Install Detection
On Android, the parent is automatically notified whenever the child installs a new app. There is no equivalent on iOS — Apple does not allow apps to detect when other apps are installed or removed.

### Remote Device Lock
On Android, the parent can lock the child's phone remotely and show a full-screen "Device Locked" message. Apple does not allow third-party apps to lock the device or display full-screen overlays. On iOS, parents can use Apple's built-in Screen Time restrictions or send the child a notification asking them to put the phone down.

### Anti-Uninstall Protection
On Android, the child cannot remove Prime Kids without the parent's permission, and any attempt triggers an alert. On iOS, there is no way to prevent the child from deleting an app — they can remove it from Settings or by long-pressing the icon. Parents should use Apple's Screen Time restrictions to prevent app deletion if needed.

### Always-On Background Service
On Android, Prime Kids runs continuously in the background 24/7, monitoring activity in real time. iOS manages app lifecycle more strictly to preserve battery — background monitoring uses Apple's scheduled refresh system, which may have brief delays between updates.

### Lock Screen Overlay
On Android, when a screen time limit is reached, Prime Kids shows a custom full-screen message (e.g. "Screen Time Limit Reached" with a friendly emoji). On iOS, Apple shows its own built-in shield UI for blocked apps — we cannot customize this screen.

### Web Browsing History
On Android, parents can see a full log of websites the child visited and which were blocked. On iOS, no API exists to read browsing history from Safari or any other browser.

---

## iOS-Only Extras ✨

These features are exclusive to the iOS version:

- **Sign in with Apple** — Required by Apple when social login is offered. Provides a fast, private sign-in option.
- **Apple Push Notification service (APNs)** — Reliable push notifications through Apple's native notification system.
- **Native Apple Family Sharing integration** — Works with Apple's built-in family management system for parental authorization.

---

## Recommendation for Marketing

**For Android promotion**, emphasize the comprehensive, always-on protection — full web filtering, app blocking with icons, remote lock, anti-uninstall, and 24/7 background monitoring. Android is the platform where Prime Kids can offer the deepest level of control.

**For iOS promotion**, emphasize the features that work great — real-time location tracking, geofencing, SOS button, activity reports, and smart alerts. Position the Apple-imposed limitations as a trade-off for Apple's strong built-in privacy protections. Recommend that iOS parents also enable Apple's Screen Time as a complement to Prime Kids for the best protection.
