import UIKit
import BackgroundTasks
import FirebaseCore

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Firebase is configured in PrimeKidsChildApp.init(); this is a safety net.
        if FirebaseApp.app() == nil { FirebaseApp.configure() }
        _ = NotificationManager.shared // installs UNUserNotificationCenter + Messaging delegates

        // Enable battery monitoring
        UIDevice.current.isBatteryMonitoringEnabled = true

        // Register background tasks
        BackgroundTaskManager.shared.registerTasks()

        // Realtime command handlers (also used after in-session pairing)
        setupCommandHandlers()

        // If already paired, start services
        if PrefsManager.shared.isPaired {
            LocationManager.shared.startTracking()
            WebSocketManager.shared.connect()
            BackgroundTaskManager.shared.scheduleTasks()

            Task {
                await RuleManager.shared.refreshRules()
                await NotificationManager.shared.registerTokenWithBackend()
            }
        }

        return true
    }

    // MARK: - APNs Token Registration

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        NotificationManager.shared.handleAPNsToken(deviceToken)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[APNs] Registration failed: \(error.localizedDescription)")
    }

    // MARK: - Background URL Session (for silent push)

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        // Silent push from the backend: { command: "sync"|"locate"|"lock"|"unlock"|"unpair" } or { type: "rules:updated" }
        let command = (userInfo["command"] as? String) ?? (userInfo["type"] as? String)
        guard let command else { completionHandler(.noData); return }
        Task {
            await CommandHandler.handle(command)
            completionHandler(.newData)
        }
    }

    // MARK: - App Lifecycle

    func applicationDidBecomeActive(_ application: UIApplication) {
        BackgroundTaskManager.shared.scheduleTasks()
        guard PrefsManager.shared.isPaired else { return }
        ScreenTimeManager.shared.checkAuthorization()
        NotificationManager.shared.refreshStatus()
        Task {
            await NotificationManager.shared.registerTokenWithBackend()
            await ActivitySyncService.shared.sendHeartbeat()
            await CommandHandler.pollQueue()
            await ActivitySyncService.shared.syncNow()
        }
    }

    // MARK: - WebSocket Command Handlers

    private func setupCommandHandlers() {
        WebSocketManager.shared.onRulesUpdated = {
            Task { await RuleManager.shared.refreshRules() }
        }
        WebSocketManager.shared.onCommand = { command in
            Task { await CommandHandler.handle(command) }
        }
        WebSocketManager.shared.onUnpaired = {
            Task { await CommandHandler.unpair() }
        }
    }
}
