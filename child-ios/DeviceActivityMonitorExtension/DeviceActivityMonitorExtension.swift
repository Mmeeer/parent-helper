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
            // New day: limit resets.
            defaults.set(false, forKey: SharedKeys.dailyLimitReached)
        }
        restoreBaselineShields()
    }

    // MARK: Daily limit

    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        guard activity.rawValue == "dailyLimit" else { return }
        defaults.set(true, forKey: SharedKeys.dailyLimitReached)
        shieldSelectionOrEverything()
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
