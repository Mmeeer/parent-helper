import Foundation

final class PrefsManager {
    static let shared = PrefsManager()
    // Shared with the app extensions via the App Group container.
    private let defaults = UserDefaults(suiteName: AppGroup.identifier) ?? .standard
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

    /// 4–6 digit PIN chosen by the parent on this device to protect "Parent settings".
    var parentPin: String? {
        get { keychain.get("parentPin") }
        set {
            if let v = newValue { keychain.save(v, forKey: "parentPin") }
            else { keychain.delete("parentPin") }
        }
    }

    // MARK: - UserDefaults (non-sensitive)

    var termsAccepted: Bool {
        get { defaults.bool(forKey: "termsAccepted") }
        set { defaults.set(newValue, forKey: "termsAccepted") }
    }

    var onboardingCompleted: Bool {
        get { defaults.bool(forKey: "onboardingCompleted") }
        set { defaults.set(newValue, forKey: "onboardingCompleted") }
    }

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
        get { defaults.string(forKey: "serverURL") ?? AppConfig.defaultServerURL }
        set { defaults.set(newValue, forKey: "serverURL") }
    }

    var isPaired: Bool {
        deviceToken != nil && childId != nil
    }

    var apnsToken: String? {
        get { defaults.string(forKey: "apnsToken") }
        set { defaults.set(newValue, forKey: "apnsToken") }
    }

    var fcmToken: String? {
        get { defaults.string(forKey: "fcmToken") }
        set { defaults.set(newValue, forKey: "fcmToken") }
    }

    func clear() {
        keychain.clear()
        let keys = ["deviceId", "childId", "parentId", "apnsToken", "fcmToken", "onboardingCompleted"]
        keys.forEach { defaults.removeObject(forKey: $0) }
    }
}
