#if canImport(FamilyControls)
import FamilyControls
import ManagedSettings
#endif
import Foundation

/// Identifiers shared by the main app and all app extensions.
/// Keep in sync with project.yml, the entitlements files and the App IDs registered on developer.apple.com.
enum AppGroup {
    static let identifier = "group.com.parenthelper.child"

    /// UserDefaults suite shared with the extensions.
    static var defaults: UserDefaults {
        UserDefaults(suiteName: identifier) ?? .standard
    }

    /// Shared container URL (App Group). Extensions can only write here.
    static var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier)
    }
}

/// A named set of apps/categories the parent can block with one remote switch.
struct BlockGroup: Codable, Identifiable {
    let id: String
    var name: String
    var selectionData: Data   // encoded FamilyActivitySelection (device-scoped tokens)
    var enabled: Bool
}

/// A per-app/group daily time limit. Tokens stay on the device; the parent app
/// edits `limitMin`/`enabled` remotely by `id`.
struct LimitRule: Codable, Identifiable {
    let id: String
    var name: String
    var selectionData: Data
    var limitMin: Int
    var enabled: Bool
}

enum SharedStore {
    static func loadGroups() -> [BlockGroup] {
        guard let d = AppGroup.defaults.data(forKey: SharedKeys.blockGroups) else { return [] }
        return (try? JSONDecoder().decode([BlockGroup].self, from: d)) ?? []
    }
    static func saveGroups(_ g: [BlockGroup]) {
        AppGroup.defaults.set((try? JSONEncoder().encode(g)) ?? Data(), forKey: SharedKeys.blockGroups)
    }
    static func loadLimits() -> [LimitRule] {
        guard let d = AppGroup.defaults.data(forKey: SharedKeys.limitRules) else { return [] }
        return (try? JSONDecoder().decode([LimitRule].self, from: d)) ?? []
    }
    static func saveLimits(_ r: [LimitRule]) {
        AppGroup.defaults.set((try? JSONEncoder().encode(r)) ?? Data(), forKey: SharedKeys.limitRules)
    }
    static func limitExceededIds() -> Set<String> {
        Set(AppGroup.defaults.stringArray(forKey: SharedKeys.limitExceededIds) ?? [])
    }
    static func markLimitExceeded(_ id: String) {
        var ids = limitExceededIds(); ids.insert(id)
        AppGroup.defaults.set(Array(ids), forKey: SharedKeys.limitExceededIds)
    }
    static func resetDailyCounters(today: String) {
        AppGroup.defaults.set([String](), forKey: SharedKeys.limitExceededIds)
        AppGroup.defaults.set(0, forKey: SharedKeys.usedMinutesToday)
        AppGroup.defaults.set(today, forKey: SharedKeys.usedMinutesDate)
    }
}

#if canImport(FamilyControls)
/// Shield computation shared by the app and the DeviceActivityMonitor extension —
/// both must agree exactly on what is shielded.
enum ShieldUnion {
    static func decode(_ data: Data?) -> FamilyActivitySelection {
        guard let data, let sel = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return FamilyActivitySelection() }
        return sel
    }

    /// Enabled block groups + legacy selection (when blocking is on) + limit rules
    /// whose daily allowance is spent.
    static func active(blockingOn: Bool) -> FamilyActivitySelection {
        var apps = Set<ApplicationToken>()
        var cats = Set<ActivityCategoryToken>()
        var webs = Set<WebDomainToken>()
        func add(_ sel: FamilyActivitySelection) {
            apps.formUnion(sel.applicationTokens)
            cats.formUnion(sel.categoryTokens)
            webs.formUnion(sel.webDomainTokens)
        }
        for g in SharedStore.loadGroups() where g.enabled { add(decode(g.selectionData)) }
        if blockingOn { add(decode(AppGroup.defaults.data(forKey: SharedKeys.familyActivitySelection))) }
        let exceeded = SharedStore.limitExceededIds()
        for r in SharedStore.loadLimits() where r.enabled && exceeded.contains(r.id) { add(decode(r.selectionData)) }
        var out = FamilyActivitySelection()
        out.applicationTokens = apps
        out.categoryTokens = cats
        out.webDomainTokens = webs
        return out
    }
}
#endif

/// Keys used in the shared UserDefaults suite.
enum SharedKeys {
    static let familyActivitySelection = "familyActivitySelection"   // Data (JSON of FamilyActivitySelection)
    static let blockingEnabled = "blockingEnabled"                    // Bool — parent toggled "block selected apps"
    static let devicePaused = "devicePaused"                          // Bool — remote pause (shield everything)
    static let dailyLimitReached = "dailyLimitReached"                // Bool — set by monitor extension
    static let activeScheduleName = "activeScheduleName"              // String? — schedule currently shielding
    static let pendingParentRequests = "pendingParentRequests"        // [String] — "Ask parent" taps from the shield
    static let cachedRules = "cachedRules"                            // Data (JSON of Rules)
    static let authorizationMember = "authorizationMember"            // "child" | "individual" — how FamilyControls was granted
    static let usedMinutesToday = "usedMinutesToday"                  // Int — managed-app usage reached today (15-min buckets)
    static let usedMinutesDate = "usedMinutesDate"                    // String "yyyy-MM-dd" the counter belongs to
    static let lastDeviceActivityAt = "lastDeviceActivityAt"          // TimeInterval — last DeviceActivity event = child actively using managed apps
    static let blockGroups = "blockGroups"                            // Data — [BlockGroup]
    static let limitRules = "limitRules"                              // Data — [LimitRule]
    static let limitExceededIds = "limitExceededIds"                  // [String] — LimitRule ids exhausted today
    static let measurementSelection = "measurementSelection"          // Data — FamilyActivitySelection used for screen-time measurement
    static let pausedUntil = "pausedUntil"
    static let monitorFingerprint = "monitorFingerprint"              // String — config hash; skip restart (and accumulator wipe) when unchanged
    static let lastMonitorError = "lastMonitorError"
    static let webDenyDomains = "webDenyDomains"                      // [String] — customBlock + fetched category domains (capped)
    static let webAllowDomains = "webAllowDomains"                   // [String] — customAllow
}
