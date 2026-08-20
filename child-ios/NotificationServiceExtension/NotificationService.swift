import UserNotifications
import ManagedSettings
import Foundation

/// Runs for every alert push with `mutable-content: 1` — including when the app was
/// force-quit (iOS never delivers *silent* pushes to a force-quit app, which made remote
/// Pause unreliable). For parent commands we therefore send a visible notification and
/// apply the enforcement right here, in the extension, before the banner is shown.
final class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttempt: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        let content = (request.content.mutableCopy() as? UNMutableNotificationContent) ?? UNMutableNotificationContent()
        bestAttempt = content

        let command = (request.content.userInfo["command"] as? String) ?? ""
        let mn = Locale.preferredLanguages.first?.hasPrefix("mn") == true
        let defaults = AppGroup.defaults
        let store = ManagedSettingsStore()

        switch command {
        case "lock", "pause":
            defaults.set(true, forKey: SharedKeys.devicePaused)
            store.shield.applications = nil
            store.shield.applicationCategories = .all()
            store.shield.webDomainCategories = .all()
            content.title = "Prime Kids"
            content.body = mn ? "Эцэг эх чинь төхөөрөмжийг түр зогсоолоо." : "Your parent paused this device."
        case "unlock", "resume":
            defaults.set(false, forKey: SharedKeys.devicePaused)
            restoreBaseline(store: store, defaults: defaults)
            content.title = "Prime Kids"
            content.body = mn ? "Төхөөрөмж дахин ашиглахад бэлэн боллоо." : "Your device is available again."
        default:
            break // other commands keep whatever text the server set
        }
        contentHandler(content)
    }

    override func serviceExtensionTimeWillExpire() {
        if let bestAttempt { contentHandler?(bestAttempt) }
    }

    /// Mirror of the app's baseline state (see ScreenTimeManager.applyCurrentState) for resume.
    private func restoreBaseline(store: ManagedSettingsStore, defaults: UserDefaults) {
        let blockingOn = defaults.bool(forKey: SharedKeys.blockingEnabled)
        let scheduleActive = defaults.string(forKey: SharedKeys.activeScheduleName) != nil
        let limitReached = defaults.bool(forKey: SharedKeys.dailyLimitReached)
        if scheduleActive || limitReached {
            store.shield.applications = nil
            store.shield.applicationCategories = .all()
            store.shield.webDomainCategories = .all()
            return
        }
        if blockingOn,
           let data = defaults.data(forKey: SharedKeys.familyActivitySelection),
           let sel = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data),
           !(sel.applicationTokens.isEmpty && sel.categoryTokens.isEmpty) {
            store.shield.applications = sel.applicationTokens.isEmpty ? nil : sel.applicationTokens
            store.shield.applicationCategories = sel.categoryTokens.isEmpty ? nil : .specific(sel.categoryTokens)
            store.shield.webDomains = sel.webDomainTokens.isEmpty ? nil : sel.webDomainTokens
            store.shield.webDomainCategories = nil
        } else {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            store.shield.webDomains = nil
            store.shield.webDomainCategories = nil
        }
    }
}

#if canImport(FamilyControls)
import FamilyControls
#endif
