import Foundation

struct Rules: Codable {
    let screenTime: ScreenTimeRules?
    let blockedApps: [String]?
    let webFilter: WebFilterRules?
}

struct ScreenTimeRules: Codable {
    let dailyLimitMin: Int?
    let perApp: [PerAppLimit]?
    let schedule: [ScheduleRule]?
}

struct PerAppLimit: Codable {
    let packageName: String
    let limitMin: Int
}

struct ScheduleRule: Codable {
    let days: [Int] // 0=Sun, 6=Sat
    let startTime: String // "HH:mm"
    let endTime: String   // "HH:mm"
    let enabled: Bool?
}

struct WebFilterRules: Codable {
    let categories: [String]?
    let customBlock: [String]?
    let customAllow: [String]?
}
