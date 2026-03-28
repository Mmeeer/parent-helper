import Foundation

final class PrefsManager {
    static let shared = PrefsManager()
    private let defaults = UserDefaults.standard
    private let keychain = KeychainManager.shared

    private init() {}

    // MARK: - Keychain (sensitive)

    var deviceToken: String? {
        get { keychain.get("deviceToken") }
        set {
            if let v = newValue { keychain.save(v, forKey: "deviceToken") }
            else { keychain.delete("deviceToken") }
        }
    }

    // MARK: - UserDefaults (non-sensitive)

    var deviceId: String? {
        get { defaults.string(forKey: "deviceId") }
        set { defaults.set(newValue, forKey: "deviceId") }
    }

    var childId: String? {
        get { defaults.string(forKey: "childId") }
        set { defaults.set(newValue, forKey: "childId") }
    }

    var parentId: String? {
        get { defaults.string(forKey: "parentId") }
        set { defaults.set(newValue, forKey: "parentId") }
    }

    var serverURL: String {
        get { defaults.string(forKey: "serverURL") ?? "https://api.primekids.com" }
        set { defaults.set(newValue, forKey: "serverURL") }
    }

    var isPaired: Bool {
        deviceToken != nil && childId != nil
    }

    var apnsToken: String? {
        get { defaults.string(forKey: "apnsToken") }
        set { defaults.set(newValue, forKey: "apnsToken") }
    }

    func clear() {
        keychain.clear()
        let keys = ["deviceId", "childId", "parentId", "apnsToken"]
        keys.forEach { defaults.removeObject(forKey: $0) }
    }
}
