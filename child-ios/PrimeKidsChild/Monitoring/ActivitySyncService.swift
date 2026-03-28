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

        // Skip sync if nothing to report
        guard !locations.isEmpty else { return }

        let request = ActivitySyncRequest(
            date: Self.todayString(),
            apps: nil, // iOS doesn't expose per-app usage to third-party apps
            location: locations,
            blockedAttempts: nil
        )

        do {
            try await APIClient.shared.syncActivity(request)
            print("[Sync] Uploaded \(locations.count) location(s)")
        } catch {
            print("[Sync] Failed: \(error.localizedDescription)")
            // Re-buffer locations on failure so they're not lost
            // In production, you'd store these to disk for retry
        }
    }

    /// Send heartbeat with current battery level
    func sendHeartbeat() async {
        guard PrefsManager.shared.isPaired else { return }

        await MainActor.run {} // ensure UI thread access for battery
        let level = await MainActor.run { Int(UIDevice.current.batteryLevel * 100) }

        do {
            try await APIClient.shared.sendHeartbeat(batteryLevel: max(level, 0))
            print("[Heartbeat] Sent (battery: \(level)%)")
        } catch {
            print("[Heartbeat] Failed: \(error.localizedDescription)")
        }
    }
}
