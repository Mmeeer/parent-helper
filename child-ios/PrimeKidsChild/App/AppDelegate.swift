import UIKit
import BackgroundTasks

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Enable battery monitoring
        UIDevice.current.isBatteryMonitoringEnabled = true

        // Register background tasks
        BackgroundTaskManager.shared.registerTasks()

        // If already paired, start services
        if PrefsManager.shared.isPaired {
            LocationManager.shared.startTracking()
            WebSocketManager.shared.connect()
            BackgroundTaskManager.shared.scheduleTasks()

            // Setup WebSocket command handlers
            setupCommandHandlers()

            Task {
                await RuleManager.shared.refreshRules()
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
        // Handle silent push notifications
        if let command = userInfo["command"] as? String {
            Task {
                switch command {
                case "sync":
                    await ActivitySyncService.shared.syncNow()
                case "locate":
                    if let loc = await LocationManager.shared.getCurrentLocation() {
                        let entry = LocationEntry(
                            lat: loc.coordinate.latitude,
                            lng: loc.coordinate.longitude,
                            timestamp: ISO8601DateFormatter().string(from: Date())
                        )
                        let formatter = DateFormatter()
                        formatter.dateFormat = "yyyy-MM-dd"
                        let sync = ActivitySyncRequest(
                            date: formatter.string(from: Date()),
                            apps: nil, location: [entry], blockedAttempts: nil
                        )
                        try? await APIClient.shared.syncActivity(sync)
                    }
                default:
                    break
                }
                completionHandler(.newData)
            }
        } else if userInfo["type"] as? String == "rules:updated" {
            Task {
                await RuleManager.shared.refreshRules()
                completionHandler(.newData)
            }
        } else {
            completionHandler(.noData)
        }
    }

    // MARK: - App Lifecycle

    func applicationDidBecomeActive(_ application: UIApplication) {
        BackgroundTaskManager.shared.scheduleTasks()
    }

    // MARK: - WebSocket Command Handlers

    private func setupCommandHandlers() {
        WebSocketManager.shared.onRulesUpdated = {
            Task { await RuleManager.shared.refreshRules() }
        }

        WebSocketManager.shared.onCommand = { command in
            Task {
                switch command {
                case "sync":
                    await ActivitySyncService.shared.syncNow()
                case "locate":
                    if let loc = await LocationManager.shared.getCurrentLocation() {
                        let entry = LocationEntry(
                            lat: loc.coordinate.latitude,
                            lng: loc.coordinate.longitude,
                            timestamp: ISO8601DateFormatter().string(from: Date())
                        )
                        let formatter = DateFormatter()
                        formatter.dateFormat = "yyyy-MM-dd"
                        let sync = ActivitySyncRequest(
                            date: formatter.string(from: Date()),
                            apps: nil, location: [entry], blockedAttempts: nil
                        )
                        try? await APIClient.shared.syncActivity(sync)
                    }
                default:
                    print("[Command] Unknown: \(command)")
                }
            }
        }
    }
}
