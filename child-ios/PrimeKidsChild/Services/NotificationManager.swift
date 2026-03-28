import Foundation
import UserNotifications
import UIKit

final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()

    @Published var isAuthorized = false

    override private init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            await MainActor.run { isAuthorized = granted }

            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }

            return granted
        } catch {
            print("[Notifications] Permission error: \(error.localizedDescription)")
            return false
        }
    }

    func handleAPNsToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        PrefsManager.shared.apnsToken = token
        print("[Notifications] APNs token: \(token.prefix(16))...")

        // Register with backend
        Task {
            try? await APIClient.shared.registerPushToken(token)
        }
    }

    // MARK: - Handle Incoming Notifications

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        // Show notification even when app is in foreground
        let content = notification.request.content
        let isSos = content.userInfo["type"] as? String == "sos"
        return isSos ? [.banner, .sound, .badge] : [.banner, .badge]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo

        // Handle silent push commands
        if let command = userInfo["command"] as? String {
            await handleRemoteCommand(command)
        }

        // Handle rule update trigger
        if userInfo["type"] as? String == "rules:updated" {
            await RuleManager.shared.refreshRules()
        }
    }

    private func handleRemoteCommand(_ command: String) async {
        switch command {
        case "sync":
            await ActivitySyncService.shared.syncNow()
        case "locate":
            if let location = await LocationManager.shared.getCurrentLocation() {
                let entry = LocationEntry(
                    lat: location.coordinate.latitude,
                    lng: location.coordinate.longitude,
                    timestamp: ISO8601DateFormatter().string(from: Date())
                )
                let sync = ActivitySyncRequest(
                    date: Self.todayString(),
                    apps: nil,
                    location: [entry],
                    blockedAttempts: nil
                )
                try? await APIClient.shared.syncActivity(sync)
            }
        default:
            print("[Notifications] Unknown command: \(command)")
        }
    }

    private static func todayString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}
