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
}
