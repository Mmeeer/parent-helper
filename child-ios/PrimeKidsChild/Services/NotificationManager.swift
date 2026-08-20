import Foundation
import UserNotifications
import UIKit
import FirebaseMessaging

/// Local + remote notifications. Remote path: APNs token → Firebase Messaging → FCM
/// registration token → backend (`POST /devices/push-token`). The backend then reaches this
/// device with the same `sendEachForMulticast` it already uses for the parent app.
final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate, MessagingDelegate {
    static let shared = NotificationManager()

    @Published var isAuthorized = false

    override private init() {
        super.init()
        if Demo.isOn { isAuthorized = true }
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self
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
        // Hand the APNs token to Firebase; it will call back with an FCM token.
        Messaging.messaging().apnsToken = deviceToken
    }

    // MARK: - MessagingDelegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken, !fcmToken.isEmpty else { return }
        PrefsManager.shared.fcmToken = fcmToken
        guard PrefsManager.shared.isPaired else { return } // sent again right after pairing
        Task { await registerTokenWithBackend() }
    }

    /// Sends the current FCM token to the backend (idempotent). Called on token refresh,
    /// after pairing, and on every foreground — the silent-push channel for parent commands
    /// (pause/locate/sync) depends on this having succeeded at least once.
    func registerTokenWithBackend() async {
        guard PrefsManager.shared.isPaired else { return }
        var token = PrefsManager.shared.fcmToken
        if token == nil {
            // Delegate may never have fired (e.g. APNs token arrived before the FCM SDK
            // finished initialising) — fetch explicitly.
            token = try? await Messaging.messaging().token()
            if let t = token { PrefsManager.shared.fcmToken = t }
        }
        guard let token, !token.isEmpty else {
            print("[Notifications] no FCM token available yet")
            return
        }
        do {
            try await APIClient.shared.registerPushToken(token)
            print("[Notifications] FCM token registered with backend")
        } catch {
            print("[Notifications] token registration failed: \(error.localizedDescription)")
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
        if let command = (userInfo["command"] as? String) ?? (userInfo["type"] as? String) {
            await CommandHandler.handle(command)
        }
    }
}
