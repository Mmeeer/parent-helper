import Foundation

struct ActivitySyncRequest: Codable {
    let date: String // YYYY-MM-DD
    let apps: [AppUsageEntry]?
    let location: [LocationEntry]?
    let blockedAttempts: [BlockedAttemptEntry]?
    /// iOS summary — DeviceActivity gives no per-app minutes to the app; we report events instead.
    var screenTime: ScreenTimeSummary? = nil

    init(date: String, apps: [AppUsageEntry]?, location: [LocationEntry]?, blockedAttempts: [BlockedAttemptEntry]?, screenTime: ScreenTimeSummary? = nil) {
        self.date = date; self.apps = apps; self.location = location; self.blockedAttempts = blockedAttempts; self.screenTime = screenTime
    }
}

struct ScreenTimeSummary: Codable {
    let limitReachedAt: String?
    let shieldEvents: Int
}

/// Pending command from the REST queue (GET /devices/commands).
struct DeviceCommand: Codable {
    let id: String
    let command: String
    let params: [String: AnyCodable]?
    let createdAt: String?
}

/// Minimal type-erased Codable for loosely-typed JSON params.
struct AnyCodable: Codable {
    let value: Any
    init(_ value: Any) { self.value = value }
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let v = try? c.decode(Bool.self) { value = v }
        else if let v = try? c.decode(Int.self) { value = v }
        else if let v = try? c.decode(Double.self) { value = v }
        else if let v = try? c.decode(String.self) { value = v }
        else if let v = try? c.decode([AnyCodable].self) { value = v.map(\.value) }
        else if let v = try? c.decode([String: AnyCodable].self) { value = v.mapValues(\.value) }
        else { value = NSNull() }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch value {
        case let v as Bool: try c.encode(v)
        case let v as Int: try c.encode(v)
        case let v as Double: try c.encode(v)
        case let v as String: try c.encode(v)
        default: try c.encodeNil()
        }
    }
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
