import Foundation

/// Single entry point for remote commands, whichever transport delivered them
/// (Socket.IO while foregrounded, FCM silent push, or the REST poll in BGAppRefresh).
enum CommandHandler {
    /// Runs a command and then heartbeats, so the parent app immediately sees that the
    /// device received it (otherwise a "sync" with nothing to upload looked like a no-op).
    static func handle(_ command: String, params: [String: Any]? = nil) async {
        await run(command, params: params)
        if command != "unpair" {
            await ActivitySyncService.shared.sendHeartbeat()
        }
    }

    private static func run(_ command: String, params: [String: Any]? = nil) async {
        switch command {
        case "sync":
            await ActivitySyncService.shared.syncNow()

        case "locate":
            LocationManager.shared.requestFreshFix()
            guard let loc = await LocationManager.shared.getCurrentLocation() else { return }
            let entry = LocationEntry(
                lat: loc.coordinate.latitude,
                lng: loc.coordinate.longitude,
                timestamp: ISO8601DateFormatter().string(from: Date())
            )
            let sync = ActivitySyncRequest(date: todayString(), apps: nil, location: [entry], blockedAttempts: nil)
            try? await APIClient.shared.syncActivity(sync)

        case "lock", "pause":
            // iOS has no device lock; "pause" shields every app until resume — or for
            // a parent-chosen duration, after which it lifts itself.
            let minutes = (params?["durationMin"] as? Int) ?? Int(params?["durationMin"] as? String ?? "")
            ScreenTimeManager.shared.setPaused(true, durationMin: minutes)

        case "unlock", "resume":
            ScreenTimeManager.shared.setPaused(false)

        case "rules:updated":
            await RuleManager.shared.refreshRules()

        case "unpair":
            await unpair()

        default:
            print("[Command] Unknown: \(command)")
        }
    }

    /// REST fallback: drain the server-side command queue (called from BGAppRefresh,
    /// on foreground and after a silent push). Acks each command after handling.
    static func pollQueue() async {
        guard PrefsManager.shared.isPaired else { return }
        do {
            let pending = try await APIClient.shared.fetchPendingCommands()
            for cmd in pending {
                await handle(cmd.command, params: cmd.params?.mapValues { $0.value })
                try? await APIClient.shared.ackCommand(id: cmd.id)
            }
        } catch {
            print("[Command] poll failed: \(error.localizedDescription)")
        }
    }

    /// Forced unpair from the parent: clear restrictions, credentials and cached state.
    static func unpair() async {
        ScreenTimeManager.shared.clearAllRestrictions()
        LocationManager.shared.stopTracking()
        WebSocketManager.shared.disconnect()
        PrefsManager.shared.clear()
        AppGroup.defaults.removeObject(forKey: SharedKeys.cachedRules)
        await MainActor.run {
            NotificationCenter.default.post(name: .primeKidsDidUnpair, object: nil)
        }
    }

    static func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }
}

extension Notification.Name {
    static let primeKidsDidUnpair = Notification.Name("PrimeKidsDidUnpair")
}
