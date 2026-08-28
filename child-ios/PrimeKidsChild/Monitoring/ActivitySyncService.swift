import Foundation
import UIKit

final class ActivitySyncService {
    static let shared = ActivitySyncService()
    private init() {}

    private static func todayString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    /// Perform a full activity sync — drain location buffer + upload to backend
    func syncNow() async {
        guard PrefsManager.shared.isPaired else { return }

        let locations = LocationManager.shared.drainLocations()
        let defaults = AppGroup.defaults

        // "Ask parent" taps recorded by the ShieldAction extension ("<iso>|<subject>")
        let pending = defaults.stringArray(forKey: SharedKeys.pendingParentRequests) ?? []
        let attempts: [BlockedAttemptEntry] = pending.compactMap { raw in
            let parts = raw.split(separator: "|", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { return nil }
            return BlockedAttemptEntry(type: "shield", target: parts[1], timestamp: parts[0])
        }
        let limitReached = defaults.bool(forKey: SharedKeys.dailyLimitReached)
        // Managed-app usage recorded by the DeviceActivityMonitor extension (15-min buckets).
        let today = Self.todayString()
        let usedMinutes = defaults.string(forKey: SharedKeys.usedMinutesDate) == today
            ? defaults.integer(forKey: SharedKeys.usedMinutesToday)
            : 0
        let summary = ScreenTimeSummary(
            limitReachedAt: limitReached ? ISO8601DateFormatter().string(from: Date()) : nil,
            shieldEvents: attempts.count,
            usedMinutes: usedMinutes
        )

        // Nothing new to upload — but still let the parent know the device is alive.
        guard !locations.isEmpty || !attempts.isEmpty || limitReached || usedMinutes > 0 else {
            await sendHeartbeat()
            return
        }

        let request = ActivitySyncRequest(
            date: Self.todayString(),
            apps: nil, // iOS doesn't expose per-app usage to third-party apps
            location: locations,
            blockedAttempts: attempts.isEmpty ? nil : attempts,
            screenTime: summary
        )

        do {
            try await APIClient.shared.syncActivity(request)
            if !pending.isEmpty { defaults.removeObject(forKey: SharedKeys.pendingParentRequests) }
            print("[Sync] Uploaded \(locations.count) location(s), \(attempts.count) shield event(s)")
        } catch {
            print("[Sync] Failed: \(error.localizedDescription)")
            // Re-buffer so the next sync retries them.
            LocationManager.shared.requeue(locations)
        }
    }

    /// Send heartbeat with current battery level
    func sendHeartbeat() async {
        guard PrefsManager.shared.isPaired else { return }

        await MainActor.run {} // ensure UI thread access for battery
        let level = await MainActor.run { Int(UIDevice.current.batteryLevel * 100) }

        do {
            try await APIClient.shared.sendHeartbeat(
                batteryLevel: max(level, 0),
                screenTimeAuthorized: ScreenTimeManager.shared.isAuthorized
            )
            print("[Heartbeat] Sent (battery: \(level)%)")
        } catch {
            print("[Heartbeat] Failed: \(error.localizedDescription)")
        }
    }
}
