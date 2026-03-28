import Foundation
import SafariServices

final class ContentBlockerService {
    static let shared = ContentBlockerService()

    private let groupId = "group.com.primekids.child"
    private let extensionId = "com.primekids.child.ContentBlocker"

    private init() {}

    /// Fetch filters from backend and update the Safari Content Blocker
    func refreshBlockList() async {
        do {
            let domains = try await APIClient.shared.fetchFilters()

            guard !domains.isEmpty else { return }

            let rules = domains.map { domain -> [String: Any] in
                let escaped = domain.domain
                    .replacingOccurrences(of: ".", with: "\\\\.")
                return [
                    "action": ["type": "block"],
                    "trigger": ["url-filter": ".*\(escaped)"],
                ]
            }

            let data = try JSONSerialization.data(withJSONObject: rules)

            // Write to shared App Group container
            if let containerURL = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: groupId
            ) {
                let fileURL = containerURL.appendingPathComponent("blockerList.json")
                try data.write(to: fileURL)
                print("[ContentBlocker] Wrote \(rules.count) rules")
            }

            // Reload the extension
            try await SFContentBlockerManager.reloadContentBlocker(
                withIdentifier: extensionId
            )
            print("[ContentBlocker] Reloaded successfully")
        } catch {
            print("[ContentBlocker] Refresh failed: \(error.localizedDescription)")
        }
    }
}
