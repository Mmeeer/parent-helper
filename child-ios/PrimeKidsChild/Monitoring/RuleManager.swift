import Foundation

final class RuleManager: ObservableObject {
    static let shared = RuleManager()

    @Published var rules: Rules?
    @Published var dailyUsageMin: Int = 0

    private let prefs = PrefsManager.shared
    private let cacheKey = SharedKeys.cachedRules

    private init() {
        loadCachedRules()
        if Demo.isOn {
            rules = Rules(
                screenTime: ScreenTimeRules(dailyLimitMin: 180, perApp: nil, schedule: [
                    ScheduleRule(days: [0,1,2,3,4,5,6], startTime: "21:30", endTime: "07:00", enabled: true, blocked: true),
                    ScheduleRule(days: [1,2,3,4,5], startTime: "08:30", endTime: "15:00", enabled: true, blocked: true),
                ]),
                blockedApps: nil, iosBlockSelected: true,
                webFilter: WebFilterRules(categories: ["adult", "gambling", "violence"], customBlock: nil, customAllow: nil)
            )
            dailyUsageMin = 80
        }
    }

    // MARK: - Fetch & Cache

    func refreshRules() async {
        if Demo.isOn { return }
        guard let childId = prefs.childId else { return }
        do {
            let newRules = try await APIClient.shared.fetchRules(childId: childId)
            await MainActor.run { self.rules = newRules }
            cacheRules(newRules)

            // Apply to ScreenTimeManager if FamilyControls is available
            ScreenTimeManager.shared.applyRules(newRules)
            // Rebuild the Safari content-blocker list from the web-filter rules
            await ContentBlockerService.shared.refreshBlockList(rules: newRules)
        } catch {
            print("[RuleManager] Fetch failed: \(error.localizedDescription)")
        }
    }

    private func cacheRules(_ rules: Rules) {
        if let data = try? JSONEncoder().encode(rules) {
            AppGroup.defaults.set(data, forKey: cacheKey)
        }
    }

    private func loadCachedRules() {
        guard let data = AppGroup.defaults.data(forKey: cacheKey),
              let cached = try? JSONDecoder().decode(Rules.self, from: data) else { return }
        rules = cached
    }

    // MARK: - Schedule Check

    var isCurrentlyBlocked: Bool {
        guard let schedule = rules?.screenTime?.schedule else { return false }

        let now = Date()
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: now) - 1 // Calendar: 1=Sun…7=Sat → 0=Sun…6=Sat (matches backend)
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"
        let currentTime = timeFormatter.string(from: now)

        for rule in schedule {
            guard rule.enabled != false else { continue }
            guard rule.days.contains(weekday) else { continue }
            if rule.startTime <= rule.endTime {
                if currentTime >= rule.startTime && currentTime < rule.endTime { return true }
            } else {
                // Cross-midnight window (e.g. 22:00–06:00)
                if currentTime >= rule.startTime || currentTime < rule.endTime { return true }
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
