import Foundation
import Combine

// FamilyControls / ManagedSettings / DeviceActivity are only available on iOS 16+
// with the Family Controls entitlement. Imports are guarded so the target still
// compiles on platforms/SDKs without the frameworks.
#if canImport(FamilyControls)
import FamilyControls
import ManagedSettings
import DeviceActivity
#endif

/// Bridges backend `Rules` to Apple's Screen Time APIs.
///
/// Responsibilities (v1):
/// - request / check FamilyControls authorization,
/// - persist the parent's `FamilyActivitySelection` (picked on this device) in the App Group,
/// - apply / clear `ManagedSettingsStore` shields for: block-selected-apps, remote pause,
///   Apple's built-in adult web filter,
/// - (re)start `DeviceActivity` schedule monitoring for bedtime/school windows and the daily
///   limit; the DeviceActivityMonitor extension applies shields when those fire.
final class ScreenTimeManager: ObservableObject {
    static let shared = ScreenTimeManager()

    @Published var isAuthorized = false
    @Published var authorizationError: String?

    private let defaults = AppGroup.defaults

    /// Usage is measured in 15-minute steps up to 8 hours (32 threshold events).
    static let usageBucketMinutes = 15
    static let usageCeilingMinutes = 480

    private var cancellables = Set<AnyCancellable>()

    private init() {
        checkAuthorization()
        #if canImport(FamilyControls)
        // The one-shot read above can race the framework at cold launch; the publisher
        // keeps the flag truthful afterwards (covers revocation while we run, too).
        AuthorizationCenter.shared.$authorizationStatus
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                guard let self, !Demo.isOn else { return }
                self.isAuthorized = status == .approved
            }
            .store(in: &cancellables)
        #endif
    }

    // MARK: - Authorization

    /// Prefer `.child`: on an iPhone signed into a Family Sharing child account the parent
    /// approves with their Apple ID and the child cannot remove the app or revoke the
    /// authorization without the parent. If the device is not a Family Sharing child
    /// (e.g. a reviewer's or a teenager's own Apple ID) fall back to `.individual`.
    func requestAuthorization() async {
        #if canImport(FamilyControls)
        let center = AuthorizationCenter.shared
        if center.authorizationStatus == .approved {
            await MainActor.run { self.isAuthorized = true; self.authorizationError = nil }
            return
        }
        var lastError: Error?
        for member in [FamilyControlsMember.child, .individual] {
            do {
                try await center.requestAuthorization(for: member)
                await MainActor.run {
                    self.isAuthorized = true
                    self.authorizationError = nil
                }
                defaults.set(member == .child ? "child" : "individual", forKey: SharedKeys.authorizationMember)
                return
            } catch {
                lastError = error
                print("[ScreenTime] Auth (\(member == .child ? "child" : "individual")) failed: \(error.localizedDescription)")
            }
        }
        await MainActor.run {
            self.isAuthorized = false
            self.authorizationError = lastError?.localizedDescription
        }
        #endif
    }

    func checkAuthorization() {
        if Demo.isOn { isAuthorized = true; return }
        #if canImport(FamilyControls)
        isAuthorized = AuthorizationCenter.shared.authorizationStatus == .approved
        #endif
    }

    // MARK: - Selection (picked on the child device by the parent)

    #if canImport(FamilyControls)
    var selection: FamilyActivitySelection {
        get {
            guard let data = defaults.data(forKey: SharedKeys.familyActivitySelection),
                  let sel = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
            else { return FamilyActivitySelection() }
            return sel
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                defaults.set(data, forKey: SharedKeys.familyActivitySelection)
            }
            applyCurrentState()
        }
    }
    #endif

    // MARK: - Apply rules from backend

    func applyRules(_ rules: Rules) {
        #if canImport(FamilyControls)
        guard isAuthorized else { return }

        // Parent's "block selected apps" toggle. On iOS the *which* comes from the on-device
        // selection; the backend flag only says whether blocking is on.
        let blockingOn = !(rules.blockedApps ?? []).isEmpty || rules.iosBlockSelected == true
        defaults.set(blockingOn, forKey: SharedKeys.blockingEnabled)

        // Apple's built-in adult-content web filter when the parent enabled the "adult" category.
        let adultFilterOn = rules.webFilter?.categories?.contains("adult") == true
        let store = ManagedSettingsStore()
        store.webContent.blockedByFilter = adultFilterOn ? .auto() : nil

        // Schedules (bedtime / school hours) + daily limit → DeviceActivity monitoring.
        restartMonitoring(rules)

        applyCurrentState()
        #endif
    }

    /// Re-evaluates shields from the shared state (selection, blocking flag, pause flag).
    func applyCurrentState() {
        #if canImport(FamilyControls)
        guard isAuthorized else { return }
        let store = ManagedSettingsStore()
        let paused = defaults.bool(forKey: SharedKeys.devicePaused)
        let blockingOn = defaults.bool(forKey: SharedKeys.blockingEnabled)
        let sel = selection

        if paused {
            // Remote "pause device": shield every app category (our own app is never shielded).
            store.shield.applications = nil
            store.shield.applicationCategories = .all()
            store.shield.webDomainCategories = .all()
        } else if blockingOn && !(sel.applicationTokens.isEmpty && sel.categoryTokens.isEmpty) {
            store.shield.applications = sel.applicationTokens.isEmpty ? nil : sel.applicationTokens
            store.shield.applicationCategories = sel.categoryTokens.isEmpty
                ? nil : .specific(sel.categoryTokens)
            store.shield.webDomains = sel.webDomainTokens.isEmpty ? nil : sel.webDomainTokens
            store.shield.webDomainCategories = nil
        } else {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            store.shield.webDomains = nil
            store.shield.webDomainCategories = nil
        }
        #endif
    }

    // MARK: - Remote pause

    func setPaused(_ paused: Bool) {
        defaults.set(paused, forKey: SharedKeys.devicePaused)
        applyCurrentState()
    }

    // MARK: - DeviceActivity monitoring

    #if canImport(FamilyControls)
    private func restartMonitoring(_ rules: Rules) {
        let center = DeviceActivityCenter()
        center.stopMonitoring()

        // Bedtime / school schedules → one activity per rule. The monitor extension shields
        // everything at intervalDidStart and clears at intervalDidEnd.
        for (idx, rule) in (rules.screenTime?.schedule ?? []).enumerated() where rule.enabled != false {
            guard let start = Self.components(rule.startTime), let end = Self.components(rule.endTime) else { continue }
            let schedule = DeviceActivitySchedule(intervalStart: start, intervalEnd: end, repeats: true)
            let name = DeviceActivityName("schedule_\(idx)")
            do {
                try center.startMonitoring(name, during: schedule)
            } catch {
                print("[ScreenTime] schedule monitor error: \(error.localizedDescription)")
            }
        }

        // Daily limit → whole-day activity with a threshold event on the parent's selection
        // (or all apps if nothing selected). The extension shields on eventDidReachThreshold.
        if let limit = rules.screenTime?.dailyLimitMin, limit > 0 {
            let day = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: 0, minute: 0),
                intervalEnd: DateComponents(hour: 23, minute: 59),
                repeats: true
            )
            let sel = selection
            let event = DeviceActivityEvent(
                applications: sel.applicationTokens,
                categories: sel.categoryTokens,
                webDomains: sel.webDomainTokens,
                threshold: DateComponents(minute: limit)
            )
            var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [
                DeviceActivityEvent.Name("dailyLimit"): event,
            ]
            // Usage measurement: iOS never hands an app the raw minute count, but a threshold
            // event tells us usage crossed that mark. A ladder of 15-minute thresholds gives the
            // parent a screen-time figure that climbs through the day (15-minute granularity).
            for minutes in stride(from: Self.usageBucketMinutes, through: Self.usageCeilingMinutes, by: Self.usageBucketMinutes) {
                events[DeviceActivityEvent.Name("usage_\(minutes)")] = DeviceActivityEvent(
                    applications: sel.applicationTokens,
                    categories: sel.categoryTokens,
                    webDomains: sel.webDomainTokens,
                    threshold: DateComponents(minute: minutes)
                )
            }
            do {
                try center.startMonitoring(DeviceActivityName("dailyLimit"), during: day, events: events)
            } catch {
                print("[ScreenTime] daily-limit monitor error: \(error.localizedDescription)")
            }
        } else {
            // No daily limit set — still measure usage so the parent sees screen time.
            let day = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: 0, minute: 0),
                intervalEnd: DateComponents(hour: 23, minute: 59),
                repeats: true
            )
            let sel = selection
            guard !(sel.applicationTokens.isEmpty && sel.categoryTokens.isEmpty) else { return }
            var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
            for minutes in stride(from: Self.usageBucketMinutes, through: Self.usageCeilingMinutes, by: Self.usageBucketMinutes) {
                events[DeviceActivityEvent.Name("usage_\(minutes)")] = DeviceActivityEvent(
                    applications: sel.applicationTokens,
                    categories: sel.categoryTokens,
                    webDomains: sel.webDomainTokens,
                    threshold: DateComponents(minute: minutes)
                )
            }
            try? center.startMonitoring(DeviceActivityName("dailyLimit"), during: day, events: events)
        }
    }

    private static func components(_ hhmm: String) -> DateComponents? {
        let parts = hhmm.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2 else { return nil }
        return DateComponents(hour: parts[0], minute: parts[1])
    }
    #endif

    // MARK: - Clear everything (unpair)

    func clearAllRestrictions() {
        #if canImport(FamilyControls)
        ManagedSettingsStore().clearAllSettings()
        DeviceActivityCenter().stopMonitoring()
        #endif
        defaults.removeObject(forKey: SharedKeys.familyActivitySelection)
        defaults.set(false, forKey: SharedKeys.blockingEnabled)
        defaults.set(false, forKey: SharedKeys.devicePaused)
    }
}
