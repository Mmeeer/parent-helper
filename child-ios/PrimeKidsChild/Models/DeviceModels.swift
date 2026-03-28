import Foundation

struct PairingRequest: Codable {
    let pairingCode: String
    let platform: String
    let model: String
    let osVersion: String
    let appVersion: String
}

struct PairingResponse: Codable {
    let deviceToken: String
    let deviceId: String
    let childId: String
    let parentId: String
}

struct HeartbeatRequest: Codable {
    let batteryLevel: Int
}

struct SosRequest: Codable {
    let message: String?
    let lat: Double?
    let lng: Double?
}

struct SosResponse: Codable {
    let status: String
    let alertId: String
}

struct DeviceInfo {
    static var model: String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machine = withUnsafePointer(to: &systemInfo.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) {
                String(validatingUTF8: $0) ?? "Unknown"
            }
        }
        return machine
    }

    static var osVersion: String {
        let os = ProcessInfo.processInfo.operatingSystemVersion
        return "\(os.majorVersion).\(os.minorVersion).\(os.patchVersion)"
    }

    static var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }
}
