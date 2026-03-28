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

    func completePairing(code: String) async throws -> PairingResponse {
        let body = PairingRequest(
            pairingCode: code.uppercased().trimmingCharacters(in: .whitespaces),
            platform: "ios",
            model: DeviceInfo.model,
            osVersion: DeviceInfo.osVersion,
            appVersion: DeviceInfo.appVersion
        )
        let data = try encoder.encode(body)
        return try await request("/devices/complete-pairing", method: "POST", body: data, authenticated: false)
    }

    // MARK: - Heartbeat

    func sendHeartbeat(batteryLevel: Int) async throws {
        let body = try encoder.encode(HeartbeatRequest(batteryLevel: batteryLevel))
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

    func registerPushToken(_ token: String) async throws {
        struct Body: Codable { let token: String; let platform: String }
        let body = try encoder.encode(Body(token: token, platform: "ios"))
        try await requestVoid("/auth/fcm-token", method: "POST", body: body)
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
