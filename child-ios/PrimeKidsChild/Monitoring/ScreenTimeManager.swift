import Foundation
import Combine
import CryptoKit

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

    /// Usage thresholds double as an activity beacon: every crossing wakes our monitor
    /// extension, which stamps "child is using the phone right now" into the App Group.
    /// 5-minute steps for the first 2 hours (fresh signal), 15-minute steps to 8 hours.
    static var usageThresholds: [Int] {
        Array(stride(from: 5, through: 120, by: 5)) + Array(stride(from: 135, through: 480, by: 15))
    }

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

    // MARK: - Selections (picked on the child device by the parent)

    #if canImport(FamilyControls)
    /// Legacy single selection — still honoured as an implicit "Blocked apps" group.
    var selection: FamilyActivitySelection {
        get { Self.decodeSelection(defaults.data(forKey: SharedKeys.familyActivitySelection)) }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                defaults.set(data, forKey: SharedKeys.familyActivitySelection)
            }
            applyCurrentState()
        }
    }

    /// What screen time is measured against. Parents are guided to Select All
    /// categories here so the figure approximates total device usage.
    var measurementSelection: FamilyActivitySelection {
        get {
            let stored = Self.decodeSelection(defaults.data(forKey: SharedKeys.measurementSelection))
            if !(stored.applicationTokens.isEmpty && stored.categoryTokens.isEmpty) { return stored }
            // Fall back to the legacy selection so upgrades keep measuring…
            let legacy = selection
            if !(legacy.applicationTokens.isEmpty && legacy.categoryTokens.isEmpty) { return legacy }
            // …and finally to everything the parent manages (groups + limit rules), so a
            // family that only ever created groups still gets a screen-time figure.
            var apps = Set<ApplicationToken>()
            var cats = Set<ActivityCategoryToken>()
            for g in SharedStore.loadGroups() { let s = ShieldUnion.decode(g.selectionData); apps.formUnion(s.applicationTokens); cats.formUnion(s.categoryTokens) }
            for r in SharedStore.loadLimits() { let s = ShieldUnion.decode(r.selectionData); apps.formUnion(s.applicationTokens); cats.formUnion(s.categoryTokens) }
            var out = FamilyActivitySelection()
            out.applicationTokens = apps
            out.categoryTokens = cats
            return out
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                defaults.set(data, forKey: SharedKeys.measurementSelection)
            }
            if let rules = RuleManager.shared.rules { restartMonitoring(rules) }
        }
    }

    static func decodeSelection(_ data: Data?) -> FamilyActivitySelection {
        ShieldUnion.decode(data)
    }

    static func activeShieldUnion(blockingOn: Bool) -> FamilyActivitySelection {
        ShieldUnion.active(blockingOn: blockingOn)
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

        // Web content enforcement. Two modes:
        //  - allowlist: ONLY the parent's allowed domains open — Apple applies this to
        //    Safari AND WebKit-based browsers/in-app views, i.e. beyond Safari.
        //  - categories: Apple's adult filter (same system-wide reach) when the parent
        //    enabled the "adult" category; the Safari content blocker handles the
        //    finer category/custom lists.
        let store = ManagedSettingsStore()
        let wf = rules.webFilter
        let deny = Set((defaults.stringArray(forKey: SharedKeys.webDenyDomains) ?? []).map { WebDomain(domain: $0) })
        let allow = Set((defaults.stringArray(forKey: SharedKeys.webAllowDomains) ?? []).map { WebDomain(domain: $0) })
        if wf?.mode == "allowlist" {
            let allowed = Set((wf?.customAllow ?? []).map { WebDomain(domain: $0) })
            store.webContent.blockedByFilter = .specific(allowed)
        } else if wf?.categories?.isEmpty == false || !deny.isEmpty {
            // Adult auto-filter plus the parent's block list (custom + category domains) —
            // enforced by iOS in Safari AND WebKit-based browsers, no extension needed.
            store.webContent.blockedByFilter = .auto(allow, except: deny)
        } else {
            store.webContent.blockedByFilter = nil
        }

        // Schedules (bedtime / school hours) + daily limit → DeviceActivity monitoring.
        restartMonitoring(rules)

        applyCurrentState()
        #endif
    }

    /// Re-evaluates shields from the shared state (groups, limits, pause, legacy flag).
    func applyCurrentState() {
        #if canImport(FamilyControls)
        guard isAuthorized else { return }
        let store = ManagedSettingsStore()

        // A timed pause that has run out clears itself even if no schedule fired.
        var paused = defaults.bool(forKey: SharedKeys.devicePaused)
        let until = defaults.double(forKey: SharedKeys.pausedUntil)
        if paused, until > 0, Date().timeIntervalSince1970 >= until {
            paused = false
            defaults.set(false, forKey: SharedKeys.devicePaused)
            defaults.set(0, forKey: SharedKeys.pausedUntil)
        }

        if paused {
            // Remote "pause device": shield everything and freeze app install/removal
            // for the duration (mirrors Android's locked state as far as iOS allows).
            store.shield.applications = nil
            store.shield.applicationCategories = .all()
            store.shield.webDomainCategories = .all()
            store.application.denyAppInstallation = true
            store.application.denyAppRemoval = true
            return
        }
        store.application.denyAppInstallation = nil
        store.application.denyAppRemoval = nil

        let union = Self.activeShieldUnion(blockingOn: defaults.bool(forKey: SharedKeys.blockingEnabled))
        if union.applicationTokens.isEmpty && union.categoryTokens.isEmpty && union.webDomainTokens.isEmpty {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            store.shield.webDomains = nil
            store.shield.webDomainCategories = nil
        } else {
            store.shield.applications = union.applicationTokens.isEmpty ? nil : union.applicationTokens
            store.shield.applicationCategories = union.categoryTokens.isEmpty ? nil : .specific(union.categoryTokens)
            store.shield.webDomains = union.webDomainTokens.isEmpty ? nil : union.webDomainTokens
            store.shield.webDomainCategories = nil
        }
        #endif
    }

    // MARK: - Remote pause

    func setPaused(_ paused: Bool, durationMin: Int? = nil) {
        defaults.set(paused, forKey: SharedKeys.devicePaused)
        if paused, let durationMin, durationMin > 0 {
            let until = Date().addingTimeInterval(TimeInterval(durationMin * 60))
            defaults.set(until.timeIntervalSince1970, forKey: SharedKeys.pausedUntil)
            #if canImport(FamilyControls)
            // One-shot DeviceActivity window: intervalDidEnd fires in the monitor
            // extension exactly at `until` and lifts the pause even if the app is asleep.
            let cal = Calendar.current
            let schedule = DeviceActivitySchedule(
                intervalStart: cal.dateComponents([.hour, .minute], from: Date()),
                intervalEnd: cal.dateComponents([.hour, .minute], from: until),
                repeats: false
            )
            try? DeviceActivityCenter().startMonitoring(DeviceActivityName("pauseWindow"), during: schedule)
            #endif
        } else {
            defaults.set(0, forKey: SharedKeys.pausedUntil)
            #if canImport(FamilyControls)
            DeviceActivityCenter().stopMonitoring([DeviceActivityName("pauseWindow")])
            #endif
        }
        applyCurrentState()
    }

    // MARK: - DeviceActivity monitoring

    #if canImport(FamilyControls)
    /// Builds an event ladder entry, counting activity from before this monitoring
    /// session where iOS allows it (17.4+) — a restart must not wipe the day's total.
    private func usageEvent(_ sel: FamilyActivitySelection, minutes: Int) -> DeviceActivityEvent {
        if #available(iOS 17.4, *) {
            return DeviceActivityEvent(
                applications: sel.applicationTokens, categories: sel.categoryTokens,
                webDomains: sel.webDomainTokens, threshold: DateComponents(minute: minutes),
                includesPastActivity: true)
        }
        return DeviceActivityEvent(
            applications: sel.applicationTokens, categories: sel.categoryTokens,
            webDomains: sel.webDomainTokens, threshold: DateComponents(minute: minutes))
    }

    /// Stable hash of everything monitoring depends on. Stop/start wipes the usage
    /// accumulator on older iOS, so we only restart when the config truly changed.
    private func monitoringFingerprint(_ rules: Rules) -> String {
        var d = Data()
        d.append((try? JSONEncoder().encode(rules.screenTime)) ?? Data())
        // Raw stored blobs, NOT a decode→re-encode of the selection: Set iteration
        // order is randomized per process, so re-encoding the same selection could
        // yield different bytes each launch → spurious restarts → accumulator wipe
        // on iOS < 17.4. The raw bytes only change when the parent actually re-picks.
        d.append(defaults.data(forKey: SharedKeys.measurementSelection) ?? Data())
        d.append(defaults.data(forKey: SharedKeys.familyActivitySelection) ?? Data())
        d.append(defaults.data(forKey: SharedKeys.blockGroups) ?? Data())
        d.append(defaults.data(forKey: SharedKeys.limitRules) ?? Data())
        return SHA256.hash(data: d).map { String(format: "%02x", $0) }.joined()
    }

    private func restartMonitoring(_ rules: Rules) {
        let center = DeviceActivityCenter()
        let fp = monitoringFingerprint(rules)
        if fp == defaults.string(forKey: SharedKeys.monitorFingerprint), !center.activities.isEmpty {
            return // unchanged and already running — do NOT reset the accumulator
        }
        center.stopMonitoring()

        // Bedtime / school schedules → one activity per rule; the monitor extension
        // shields everything at intervalDidStart and clears at intervalDidEnd.
        var monitorError: String? = nil
        for (idx, rule) in (rules.screenTime?.schedule ?? []).enumerated() where rule.enabled != false {
            guard let start = Self.components(rule.startTime), let end = Self.components(rule.endTime) else { continue }
            let schedule = DeviceActivitySchedule(intervalStart: start, intervalEnd: end, repeats: true)
            do { try center.startMonitoring(DeviceActivityName("schedule_\(idx)"), during: schedule) }
            catch { monitorError = "schedule: \(error)" }
        }

        let day = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )

        // Daily activity: usage ladder (screen-time measurement + activity beacon) on the
        // measurement selection, plus the whole-day limit threshold when configured.
        let measured = measurementSelection
        var dayEvents: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
        if !(measured.applicationTokens.isEmpty && measured.categoryTokens.isEmpty) {
            for minutes in Self.usageThresholds {
                dayEvents[DeviceActivityEvent.Name("usage_\(minutes)")] = usageEvent(measured, minutes: minutes)
            }
            if let limit = rules.screenTime?.dailyLimitMin, limit > 0 {
                dayEvents[DeviceActivityEvent.Name("dailyLimit")] = usageEvent(measured, minutes: limit)
            }
        }

        // Per-app/group limits: one threshold per enabled rule; the extension shields
        // just that rule's tokens when it fires ("limit_<id>").
        for rule in SharedStore.loadLimits() where rule.enabled && rule.limitMin > 0 {
            let sel = Self.decodeSelection(rule.selectionData)
            guard !(sel.applicationTokens.isEmpty && sel.categoryTokens.isEmpty) else { continue }
            dayEvents[DeviceActivityEvent.Name("limit_\(rule.id)")] = usageEvent(sel, minutes: rule.limitMin)
        }

        if !dayEvents.isEmpty {
            do { try center.startMonitoring(DeviceActivityName("dailyLimit"), during: day, events: dayEvents) }
            catch { monitorError = "day: \(error)" }
        }

        // Success ⇒ remember the config; failure ⇒ surface it instead of hiding it.
        if let monitorError {
            defaults.set(monitorError, forKey: SharedKeys.lastMonitorError)
            defaults.removeObject(forKey: SharedKeys.monitorFingerprint)
            print("[ScreenTime] monitoring error: \(monitorError)")
        } else {
            defaults.removeObject(forKey: SharedKeys.lastMonitorError)
            defaults.set(fp, forKey: SharedKeys.monitorFingerprint)
        }

        // Re-arm a still-running timed pause across monitoring restarts.
        let until = defaults.double(forKey: SharedKeys.pausedUntil)
        if defaults.bool(forKey: SharedKeys.devicePaused), until > Date().timeIntervalSince1970 {
            let cal = Calendar.current
            let schedule = DeviceActivitySchedule(
                intervalStart: cal.dateComponents([.hour, .minute], from: Date()),
                intervalEnd: cal.dateComponents([.hour, .minute], from: Date(timeIntervalSince1970: until)),
                repeats: false
            )
            try? center.startMonitoring(DeviceActivityName("pauseWindow"), during: schedule)
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
