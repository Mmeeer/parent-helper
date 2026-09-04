import ManagedSettings
import Foundation

/// Handles the buttons on the Prime Kids shield.
/// Primary = "Close" (dismiss), Secondary = "Ask parent" → queued in the App Group;
/// the main app forwards it to the parent on next launch / background refresh.
final class ShieldActionExtension: ShieldActionDelegate {
    private let defaults = AppGroup.defaults

    override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(action, subject: "app", completionHandler: completionHandler)
    }

    override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(action, subject: "web", completionHandler: completionHandler)
    }

    override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(action, subject: "category", completionHandler: completionHandler)
    }

    /// Every shield interaction is a real blocked attempt — count it for the parent's
    /// stats regardless of which button was tapped. (Ask-parent additionally queues a
    /// request below; the count uses its own key so stats don't create alert spam.)
    private func bumpBlockedCounter() {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        let today = f.string(from: Date())
        if defaults.string(forKey: SharedKeys.shieldEventsDate) != today {
            defaults.set(today, forKey: SharedKeys.shieldEventsDate)
            defaults.set(0, forKey: SharedKeys.shieldEventsToday)
        }
        defaults.set(defaults.integer(forKey: SharedKeys.shieldEventsToday) + 1, forKey: SharedKeys.shieldEventsToday)
    }

    private func respond(_ action: ShieldAction, subject: String, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        bumpBlockedCounter()
        switch action {
        case .primaryButtonPressed:
            completionHandler(.close)
        case .secondaryButtonPressed:
            var pending = defaults.stringArray(forKey: SharedKeys.pendingParentRequests) ?? []
            pending.append("\(ISO8601DateFormatter().string(from: Date()))|\(subject)")
            defaults.set(Array(pending.suffix(50)), forKey: SharedKeys.pendingParentRequests)
            completionHandler(.defer)
        @unknown default:
            completionHandler(.close)
        }
    }
}
