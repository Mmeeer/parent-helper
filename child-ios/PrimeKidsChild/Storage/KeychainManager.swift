import Foundation
import Security

final class KeychainManager {
    static let shared = KeychainManager()
    private init() {}

    private let service = "com.parenthelper.child"
    /// App Group used as keychain access group so extensions can read the device token.
    /// Unsigned simulator builds have no entitlements, so the access group is omitted there.
    #if targetEnvironment(simulator)
    private let accessGroup: String? = nil
    #else
    private let accessGroup: String? = AppGroup.identifier
    #endif

    private func withGroup(_ q: [String: Any]) -> [String: Any] {
        var q = q
        if let g = accessGroup { q[kSecAttrAccessGroup as String] = g }
        return q
    }

    func save(_ value: String, forKey key: String) {
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(withGroup(query) as CFDictionary)

        var newItem = withGroup(query)
        newItem[kSecValueData as String] = data
        newItem[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        let status = SecItemAdd(newItem as CFDictionary, nil)
        if status != errSecSuccess { print("[Keychain] save '\(key)' failed: \(status)") }
    }

    func get(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(withGroup(query) as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else {
            if status != errSecItemNotFound { print("[Keychain] read '\(key)' failed: \(status)") }
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(withGroup(query) as CFDictionary)
    }

    func clear() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
        ]
        SecItemDelete(withGroup(query) as CFDictionary)
    }
}
