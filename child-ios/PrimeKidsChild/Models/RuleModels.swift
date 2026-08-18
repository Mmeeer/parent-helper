import Foundation

struct Rules: Codable {
    let screenTime: ScreenTimeRules?
    /// Android package names. On iOS only "non-empty" is meaningful (blocking on/off);
    /// the actual apps come from the on-device FamilyActivitySelection.
    let blockedApps: [String]?
    /// iOS-only flag set by the parent app: shield the apps selected on the child device.
    let iosBlockSelected: Bool?
    let webFilter: WebFilterRules?
}

struct ScreenTimeRules: Codable {
    let dailyLimitMin: Int?
    let perApp: [PerAppLimit]?
    let schedule: [ScheduleRule]?
}

struct PerAppLimit: Codable {
    /// Backend field is `appId` (package name on Android, opaque id on iOS). Older payloads used `packageName`.
    let appId: String?
    let packageName: String?
    let appName: String?
    let limitMin: Int
}

struct ScheduleRule: Codable {
    let days: [Int] // 0=Sun, 6=Sat (same as JS Date.getDay())
    let startTime: String // "HH:mm"
    let endTime: String   // "HH:mm"
    let enabled: Bool?
    let blocked: Bool?
}

struct WebFilterRules: Codable {
    let categories: [String]?
    let customBlock: [String]?
    let customAllow: [String]?
}
