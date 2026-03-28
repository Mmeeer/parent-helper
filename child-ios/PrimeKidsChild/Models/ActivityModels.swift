import Foundation

struct ActivitySyncRequest: Codable {
    let date: String // YYYY-MM-DD
    let apps: [AppUsageEntry]?
    let location: [LocationEntry]?
    let blockedAttempts: [BlockedAttemptEntry]?
}

struct AppUsageEntry: Codable {
    let packageName: String
    let appName: String
    let durationMin: Int
}

struct LocationEntry: Codable {
    let lat: Double
    let lng: Double
    let timestamp: String
}

struct BlockedAttemptEntry: Codable {
    let type: String // "app", "web", "schedule"
    let target: String
    let timestamp: String
}

struct ContentFilterDomain: Codable {
    let domain: String
    let category: String
}

struct APIError: Codable {
    let error: String?
    let message: String?
}
