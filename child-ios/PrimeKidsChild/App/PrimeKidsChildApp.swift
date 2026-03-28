import SwiftUI

@main
struct PrimeKidsChildApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var isPaired = PrefsManager.shared.isPaired

    var body: some Scene {
        WindowGroup {
            Group {
                if isPaired {
                    DashboardView()
                } else {
                    PairingView(isPaired: $isPaired)
                }
            }
            .onChange(of: isPaired) { _, newValue in
                if newValue {
                    onPaired()
                }
            }
        }
    }

    private func onPaired() {
        // Start all services after successful pairing
        LocationManager.shared.requestAlwaysAuthorization()
        LocationManager.shared.startTracking()
        WebSocketManager.shared.connect()
        BackgroundTaskManager.shared.scheduleTasks()

        Task {
            await NotificationManager.shared.requestPermission()
            await RuleManager.shared.refreshRules()
            await ScreenTimeManager.shared.requestAuthorization()
        }
    }
}
