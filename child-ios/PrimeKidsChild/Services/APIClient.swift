import Foundation

final class APIClient {
    static let shared = APIClient()
    private let prefs = PrefsManager.shared
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        session = URLSession(configuration: config)
    }

    private var baseURL: String { prefs.serverURL }

    // MARK: - Core Request

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: Data? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        guard let url = URL(string: baseURL + path) else {
            throw APIClientError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated, let token = prefs.deviceToken {
            request.setValue(token, forHTTPHeaderField: "X-Device-Token")
        }

        if let body = body {
            request.httpBody = body
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let apiError = try? decoder.decode(APIError.self, from: data)
            throw APIClientError.server(
                status: httpResponse.statusCode,
                message: apiError?.error ?? apiError?.message ?? "Request failed"
            )
        }

        return try decoder.decode(T.self, from: data)
    }

    private func requestVoid(
        _ path: String,
        method: String = "GET",
        body: Data? = nil,
        authenticated: Bool = true
    ) async throws {
        guard let url = URL(string: baseURL + path) else {
            throw APIClientError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated, let token = prefs.deviceToken {
            request.setValue(token, forHTTPHeaderField: "X-Device-Token")
        }

        if let body = body {
            request.httpBody = body
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let apiError = try? decoder.decode(APIError.self, from: data)
            throw APIClientError.server(
                status: httpResponse.statusCode,
                message: apiError?.error ?? apiError?.message ?? "Request failed"
            )
        }
    }

    // MARK: - Pairing

    /// Public app configuration (no auth): legal terms + misc. Used before pairing.
    func fetchAppConfig() async throws -> AppConfigResponse {
        return try await request("/config/app", authenticated: false)
    }

    /// POST /rules/:childId/ios-structure — group/limit metadata (names, counts, minutes).
    func uploadIosStructure(childId: String, groups: [[String: Any]], limits: [[String: Any]]) async throws {
        let body = try JSONSerialization.data(withJSONObject: ["groups": groups, "limits": limits])
        try await requestVoid("/rules/\(childId)/ios-structure", method: "POST", body: body)
    }

    func completePairing(code: String) async throws -> PairingResponse {
        let body = PairingRequest(
            pairingCode: code.uppercased().trimmingCharacters(in: .whitespaces),
            platform: "ios",
            model: DeviceInfo.model,
            osVersion: DeviceInfo.osVersion,
            appVersion: DeviceInfo.appVersion,
            acceptedTerms: PrefsManager.shared.termsAccepted
        )
        let data = try encoder.encode(body)
        return try await request("/devices/complete-pairing", method: "POST", body: data, authenticated: false)
    }

    // MARK: - Heartbeat

    func sendHeartbeat(batteryLevel: Int, screenTimeAuthorized: Bool? = nil, lastActiveAt: String? = nil) async throws {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "?"
        var payload: [String: Any] = ["batteryLevel": batteryLevel, "appVersion": "\(v) (\(b))"]
        if let screenTimeAuthorized { payload["screenTimeAuthorized"] = screenTimeAuthorized }
        if let lastActiveAt { payload["lastActiveAt"] = lastActiveAt }
        let body = try JSONSerialization.data(withJSONObject: payload)
        try await requestVoid("/devices/heartbeat", method: "POST", body: body)
    }

    // MARK: - SOS

    func sendSos(message: String? = nil, lat: Double? = nil, lng: Double? = nil) async throws -> SosResponse {
        let body = try encoder.encode(SosRequest(message: message, lat: lat, lng: lng))
        return try await request("/devices/sos", method: "POST", body: body)
    }

    // MARK: - Rules

    func fetchRules(childId: String) async throws -> Rules {
        return try await request("/rules/\(childId)")
    }

    // MARK: - Activity Sync

    func syncActivity(_ activity: ActivitySyncRequest) async throws {
        let body = try encoder.encode(activity)
        try await requestVoid("/activity/sync", method: "POST", body: body)
    }

    // MARK: - Content Filters

    func fetchFilters(categories: [String]? = nil) async throws -> [ContentFilterDomain] {
        var path = "/filters"
        if let cats = categories, !cats.isEmpty {
            let query = cats.map { "categories=\($0)" }.joined(separator: "&")
            path += "?\(query)"
        }
        return try await request(path)
    }

    // MARK: - FCM Token

    /// Registers the FCM registration token for this child device (device-token auth).
    /// Backend route: POST /devices/push-token  { token, platform: "ios" }  (see IOS_SUBMISSION_PLAN §4 B1)
    func registerPushToken(_ token: String) async throws {
        let body = try JSONSerialization.data(withJSONObject: ["token": token, "platform": "ios"])
        try await requestVoid("/devices/push-token", method: "POST", body: body)
    }

    // MARK: - Commands (REST fallback to Socket.IO / silent push)

    /// GET /devices/commands → pending commands for this device (oldest first).
    func fetchPendingCommands() async throws -> [DeviceCommand] {
        return try await request("/devices/commands")
    }

    /// POST /devices/commands/:id/ack
    func ackCommand(id: String) async throws {
        try await requestVoid("/devices/commands/\(id)/ack", method: "POST", body: nil)
    }

    // MARK: - iOS app selection (FamilyActivitySelection metadata)

    /// POST /rules/:childId/ios-selection  { blob, appCount, categoryCount, webDomainCount }
    func uploadIosSelection(childId: String, blob: String, appCount: Int, categoryCount: Int, webDomainCount: Int) async throws {
        let body = try JSONSerialization.data(withJSONObject: [
            "blob": blob, "appCount": appCount, "categoryCount": categoryCount, "webDomainCount": webDomainCount,
        ])
        try await requestVoid("/rules/\(childId)/ios-selection", method: "POST", body: body)
    }
}

enum APIClientError: LocalizedError {
    case invalidURL
    case invalidResponse
    case server(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response"
        case .server(_, let message): return message
        }
    }
}
