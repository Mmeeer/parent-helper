import Foundation

/// Build-time configuration. Values come from Info.plist keys injected via xcconfig
/// (see Config/Debug.xcconfig / Config/Release.xcconfig) with safe fallbacks.
enum AppConfig {
    /// Backend base URL — nginx proxies `/parent-helper` to the API (Socket.IO/WSS included).
    static var defaultServerURL: String {
        if let v = Bundle.main.object(forInfoDictionaryKey: "PKServerURL") as? String, !v.isEmpty {
            return v
        }
        return "https://primekids.masterclass.mn/parent-helper"
    }

    static var appVersion: String {
        (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String) ?? "0"
    }

    static var buildNumber: String {
        (Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String) ?? "0"
    }
}
