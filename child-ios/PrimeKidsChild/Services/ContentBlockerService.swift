import Foundation
import SafariServices

/// Builds the Safari Content Blocker rule list from the parent's web-filter rules and
/// the backend category domain list, writes it to the App Group, and reloads the extension.
final class ContentBlockerService {
    static let shared = ContentBlockerService()

    static let extensionId = "com.parenthelper.child.ContentBlocker"
    /// Safari refuses lists over 150k rules; we stay far below that.
    private let maxRules = 50_000

    private init() {}

    /// Fetch category domains for the parent's selected categories + custom lists,
    /// write the rule file, reload the extension.
    func refreshBlockList(rules: Rules?) async {
        let categories = rules?.webFilter?.categories ?? []
        let customBlock = rules?.webFilter?.customBlock ?? []
        let customAllow = Set((rules?.webFilter?.customAllow ?? []).map { $0.lowercased() })

        var domains: [String] = customBlock
        if !categories.isEmpty {
            do {
                let fetched = try await APIClient.shared.fetchFilters(categories: categories)
                domains.append(contentsOf: fetched.map(\.domain))
            } catch {
                print("[ContentBlocker] filter fetch failed: \(error.localizedDescription)")
            }
        }

        let unique = Array(Set(domains.map { $0.lowercased() }))
            .filter { !$0.isEmpty && !customAllow.contains($0) }
            .sorted()
            .prefix(maxRules)

        // Persist for ManagedSettings web-content enforcement (the primary, system-wide
        // path — works with zero user setup once Screen Time is authorised). The Safari
        // content blocker below is a bonus layer for devices where it happens to be on.
        // The parent's explicit blocks go FIRST so a large category list can never
        // push them past the cap.
        let customFirst = customBlock.map { $0.lowercased() }.filter { !$0.isEmpty && !customAllow.contains($0) }
        let categoryOnly = unique.filter { !customFirst.contains($0) }
        var managedDeny: [String] = []
        for d in customFirst + categoryOnly where !managedDeny.contains(d) && managedDeny.count < 950 { managedDeny.append(d) }
        AppGroup.defaults.set(managedDeny, forKey: SharedKeys.webDenyDomains)
        AppGroup.defaults.set(Array(customAllow).sorted(), forKey: SharedKeys.webAllowDomains)

        var ruleList: [[String: Any]] = unique.map { domain in
            [
                "action": ["type": "block"],
                // Match the domain and any subdomain, e.g. ^https?://([^/]+\.)?example\.com[/:]?
                "trigger": [
                    "url-filter": "^https?://([^/]+\\.)?\(Self.escape(domain))([/:?#]|$)",
                    "url-filter-is-case-sensitive": false,
                ],
            ]
        }
        // Explicit allow-list entries win over blocks (Safari applies "ignore-previous-rules").
        for allowed in customAllow.sorted() {
            ruleList.append([
                "action": ["type": "ignore-previous-rules"],
                "trigger": ["url-filter": "^https?://([^/]+\\.)?\(Self.escape(allowed))([/:?#]|$)"],
            ])
        }
        if ruleList.isEmpty {
            ruleList = [["action": ["type": "block"], "trigger": ["url-filter": "^$"]]]
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: ruleList)
            guard let container = AppGroup.containerURL else {
                print("[ContentBlocker] no App Group container")
                return
            }
            try data.write(to: container.appendingPathComponent("blockerList.json"), options: .atomic)
            try await SFContentBlockerManager.reloadContentBlocker(withIdentifier: Self.extensionId)
            print("[ContentBlocker] \(ruleList.count) rules written and reloaded")
        } catch {
            print("[ContentBlocker] refresh failed: \(error.localizedDescription)")
        }
    }

    /// Whether the user has enabled the extension in Settings → Safari → Extensions.
    func isEnabled() async -> Bool {
        if Demo.isOn { return true }
        return await withCheckedContinuation { cont in
            SFContentBlockerManager.getStateOfContentBlocker(withIdentifier: Self.extensionId) { state, _ in
                cont.resume(returning: state?.isEnabled ?? false)
            }
        }
    }

    /// Escapes regex metacharacters for use inside a content-blocker `url-filter`.
    static func escape(_ s: String) -> String {
        var out = ""
        for ch in s {
            if ".*+?^$()[]{}|\\/".contains(ch) { out.append("\\") }
            out.append(ch)
        }
        return out
    }
}
