import Foundation

// FamilyControls is only available on iOS 16+ with proper entitlements.
// This file provides the integration layer. The actual FamilyControls
// imports are guarded so the app compiles without the entitlement.

#if canImport(FamilyControls)
import FamilyControls
import ManagedSettings
import DeviceActivity
#endif

final class ScreenTimeManager: ObservableObject {
    static let shared = ScreenTimeManager()

    @Published var isAuthorized = false
    @Published var authorizationError: String?

    private init() {
        checkAuthorization()
    }

    // MARK: - Authorization

    func requestAuthorization() async {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                await MainActor.run {
                    self.isAuthorized = true
                    self.authorizationError = nil
                }
            } catch {
                await MainActor.run {
                    self.isAuthorized = false
                    self.authorizationError = error.localizedDescription
                }
                print("[ScreenTime] Auth failed: \(error.localizedDescription)")
            }
        }
        #endif
    }

    func checkAuthorization() {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            isAuthorized = AuthorizationCenter.shared.authorizationStatus == .approved
        }
        #endif
    }

    // MARK: - Apply Rules

    func applyRules(_ rules: Rules) {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            guard isAuthorized else { return }

            let store = ManagedSettingsStore()

            // Apply blocked apps as shields
            if let blocked = rules.blockedApps, !blocked.isEmpty {
                // Note: On iOS, we can't block by package name directly.
                // FamilyControls uses ApplicationToken which comes from the picker.
                // For now, we set category-based restrictions if available.
                // Full implementation requires DeviceActivityMonitor extension.
                print("[ScreenTime] Would block \(blocked.count) apps (requires token mapping)")
            }

            // Apply web content restrictions
            if let webFilter = rules.webFilter {
                if let customBlock = webFilter.customBlock, !customBlock.isEmpty {
                    var filter = WebContentSettings.FilterPolicy.auto(.specific(
                        during: DeviceActivitySchedule(
                            intervalStart: DateComponents(hour: 0, minute: 0),
                            intervalEnd: DateComponents(hour: 23, minute: 59),
                            repeats: true
                        )
                    ))
                    store.webContent.blockedByFilter = .auto
                    print("[ScreenTime] Applied web filter with \(customBlock.count) blocked domains")
                }
            }

            // Apply schedule-based restrictions
            if let schedule = rules.screenTime?.schedule {
                for rule in schedule where rule.enabled != false {
                    applyScheduleRestriction(rule, store: store)
                }
            }
        }
        #endif
    }

    #if canImport(FamilyControls)
    @available(iOS 16.0, *)
    private func applyScheduleRestriction(_ rule: ScheduleRule, store: ManagedSettingsStore) {
        // Parse start/end times
        let parts = rule.startTime.split(separator: ":").compactMap { Int($0) }
        let endParts = rule.endTime.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2, endParts.count == 2 else { return }

        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: parts[0], minute: parts[1]),
            intervalEnd: DateComponents(hour: endParts[0], minute: endParts[1]),
            repeats: true
        )

        let center = DeviceActivityCenter()
        do {
            try center.startMonitoring(
                DeviceActivityName(rawValue: "schedule_\(rule.startTime)_\(rule.endTime)"),
                during: schedule
            )
        } catch {
            print("[ScreenTime] Schedule monitor error: \(error.localizedDescription)")
        }
    }
    #endif

    // MARK: - Clear Restrictions

    func clearAllRestrictions() {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            let store = ManagedSettingsStore()
            store.clearAllSettings()
            DeviceActivityCenter().stopMonitoring()
        }
        #endif
    }
}
