import Foundation

final class RuleManager: ObservableObject {
    static let shared = RuleManager()

    @Published var rules: Rules?
    @Published var dailyUsageMin: Int = 0

    private let prefs = PrefsManager.shared
    private let cacheKey = "cachedRules"

    private init() {
        loadCachedRules()
    }

    // MARK: - Fetch & Cache

    func refreshRules() async {
        guard let childId = prefs.childId else { return }
        do {
            let newRules = try await APIClient.shared.fetchRules(childId: childId)
            await MainActor.run { self.rules = newRules }
            cacheRules(newRules)

            // Apply to ScreenTimeManager if FamilyControls is available
            ScreenTimeManager.shared.applyRules(newRules)
        } catch {
            print("[RuleManager] Fetch failed: \(error.localizedDescription)")
        }
    }

    private func cacheRules(_ rules: Rules) {
        if let data = try? JSONEncoder().encode(rules) {
            UserDefaults.standard.set(data, forKey: cacheKey)
        }
    }

    private func loadCachedRules() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let cached = try? JSONDecoder().decode(Rules.self, from: data) else { return }
        rules = cached
    }

    // MARK: - Schedule Check

    var isCurrentlyBlocked: Bool {
        guard let schedule = rules?.screenTime?.schedule else { return false }

        let now = Date()
        let calendar = Calendar.current
        let weekday = (calendar.component(.weekday, from: now) + 5) % 7 // Convert to 0=Mon
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"
        let currentTime = timeFormatter.string(from: now)

        for rule in schedule {
            guard rule.enabled != false else { continue }
            if rule.days.contains(weekday) && currentTime >= rule.startTime && currentTime < rule.endTime {
                return true
            }
        }
        return false
    }

    var isDailyLimitExceeded: Bool {
        guard let limit = rules?.screenTime?.dailyLimitMin else { return false }
        return dailyUsageMin >= limit
    }

    func updateDailyUsage(minutes: Int) {
        DispatchQueue.main.async {
            self.dailyUsageMin = minutes
        }
    }
}
