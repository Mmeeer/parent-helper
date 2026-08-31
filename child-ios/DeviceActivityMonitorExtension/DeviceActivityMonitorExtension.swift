import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

/// Fires on DeviceActivity schedule boundaries / thresholds started by the main app
/// (`ScreenTimeManager.restartMonitoring`). Runs in its own sandbox: no network, no UI —
/// it only flips ManagedSettings shields and records state in the shared App Group.
final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    private let store = ManagedSettingsStore()
    private let defaults = AppGroup.defaults

    // MARK: Schedules (bedtime / school hours)

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        guard activity.rawValue.hasPrefix("schedule_") else { return }
        defaults.set(activity.rawValue, forKey: SharedKeys.activeScheduleName)
        shieldEverything()
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        if activity.rawValue.hasPrefix("schedule_") {
            defaults.removeObject(forKey: SharedKeys.activeScheduleName)
        } else if activity.rawValue == "dailyLimit" {
            // New day: whole-day limit, per-rule limits and the usage ladder all reset.
            defaults.set(false, forKey: SharedKeys.dailyLimitReached)
            SharedStore.resetDailyCounters(today: Self.todayString())
        } else if activity.rawValue == "pauseWindow" {
            // Timed pause ran out — lift it even though the app itself is asleep.
            defaults.set(false, forKey: SharedKeys.devicePaused)
            defaults.set(0, forKey: SharedKeys.pausedUntil)
            store.application.denyAppInstallation = nil
            store.application.denyAppRemoval = nil
        }
        restoreBaselineShields()
    }

    // MARK: Daily limit

    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)

        // Any threshold crossing means the child is using managed apps *right now*.
        // The extension has no network access, so it stamps the time; the app uploads
        // the stamp on its next wake (heartbeat / silent-push ping / location).
        defaults.set(Date().timeIntervalSince1970, forKey: SharedKeys.lastDeviceActivityAt)

        // Usage ladder: "usage_45" means the child has now spent 45 minutes in the managed
        // apps today. Record the highest bucket reached; the app uploads it on its next sync.
        if event.rawValue.hasPrefix("usage_"),
           let minutes = Int(event.rawValue.dropFirst("usage_".count)) {
            let today = Self.todayString()
            if defaults.string(forKey: SharedKeys.usedMinutesDate) != today {
                defaults.set(today, forKey: SharedKeys.usedMinutesDate)
                defaults.set(0, forKey: SharedKeys.usedMinutesToday)
            }
            if minutes > defaults.integer(forKey: SharedKeys.usedMinutesToday) {
                defaults.set(minutes, forKey: SharedKeys.usedMinutesToday)
            }
            return
        }

        // Per-rule limit exhausted: shield that rule's apps on top of whatever is active.
        if event.rawValue.hasPrefix("limit_") {
            let id = String(event.rawValue.dropFirst("limit_".count))
            SharedStore.markLimitExceeded(id)
            applyUnionShields()
            return
        }

        guard activity.rawValue == "dailyLimit", event.rawValue == "dailyLimit" else { return }
        defaults.set(true, forKey: SharedKeys.dailyLimitReached)
        shieldSelectionOrEverything()
    }

    /// Recompute the union of groups + spent limits + legacy selection and apply it.
    private func applyUnionShields() {
        let union = ShieldUnion.active(blockingOn: defaults.bool(forKey: SharedKeys.blockingEnabled))
        store.shield.applications = union.applicationTokens.isEmpty ? nil : union.applicationTokens
        store.shield.applicationCategories = union.categoryTokens.isEmpty ? nil : .specific(union.categoryTokens)
        store.shield.webDomains = union.webDomainTokens.isEmpty ? nil : union.webDomainTokens
    }

    private static func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    // MARK: Helpers

    private func shieldEverything() {
        store.shield.applications = nil
        store.shield.applicationCategories = .all()
        store.shield.webDomainCategories = .all()
    }

    private func shieldSelectionOrEverything() {
        let sel = loadSelection()
        if sel.applicationTokens.isEmpty && sel.categoryTokens.isEmpty {
            shieldEverything()
        } else {
            store.shield.applications = sel.applicationTokens.isEmpty ? nil : sel.applicationTokens
            store.shield.applicationCategories = sel.categoryTokens.isEmpty ? nil : .specific(sel.categoryTokens)
            store.shield.webDomains = sel.webDomainTokens.isEmpty ? nil : sel.webDomainTokens
        }
    }

    /// Back to whatever the app-level state says (paused / block-selected / nothing).
    /// Mirrors `ScreenTimeManager.applyCurrentState()` — kept in sync by hand because the
    /// extension cannot link the app module.
    private func restoreBaselineShields() {
        let paused = defaults.bool(forKey: SharedKeys.devicePaused)
        let blockingOn = defaults.bool(forKey: SharedKeys.blockingEnabled)
        let limitReached = defaults.bool(forKey: SharedKeys.dailyLimitReached)
        let scheduleActive = defaults.string(forKey: SharedKeys.activeScheduleName) != nil

        if paused || scheduleActive {
            shieldEverything()
        } else if limitReached {
            shieldSelectionOrEverything()
        } else if blockingOn {
            let sel = loadSelection()
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

    private func loadSelection() -> FamilyActivitySelection {
        guard let data = defaults.data(forKey: SharedKeys.familyActivitySelection),
              let sel = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return FamilyActivitySelection() }
        return sel
    }
}
