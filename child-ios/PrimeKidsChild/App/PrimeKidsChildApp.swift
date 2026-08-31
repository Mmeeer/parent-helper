import SwiftUI
import FirebaseCore

#if DEBUG
/// Screenshot / UI-test hooks. Debug builds only — compiled out of Release.
///   -pkPairCode PRIME888     auto-pair on launch (uses the live backend)
///   -pkScene onboarding|dashboard|settings|parent   open a scene directly
///   -pkStep N                onboarding step index
enum DebugLaunch {
    static func arg(_ name: String) -> String? {
        let a = ProcessInfo.processInfo.arguments
        guard let i = a.firstIndex(of: name), i + 1 < a.count else { return nil }
        return a[i + 1]
    }
    static var pairCode: String? { arg("-pkPairCode") }
    static var scene: String? { arg("-pkScene") }
    static var step: Int { Int(arg("-pkStep") ?? "") ?? 0 }
    /// -pkDemo: present the app in a healthy paired state (all permissions granted, sample
    /// usage) for App Store screenshots. Pure presentation — no backend or system state changes.
    static var demo: Bool { ProcessInfo.processInfo.arguments.contains("-pkDemo") }
}
#endif

/// Screenshot demo state. Always `false` in Release.
enum Demo {
    static var isOn: Bool {
        #if DEBUG
        return DebugLaunch.demo
        #else
        return false
        #endif
    }
}

@main
struct PrimeKidsChildApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    init() {
        // Firebase must be configured before anything touches Messaging (NotificationManager
        // is created by the first view that observes it). Messaging only — no Analytics.
        if FirebaseApp.app() == nil { FirebaseApp.configure() }
    }
    @State private var isPaired = PrefsManager.shared.isPaired || Demo.isOn
    @State private var pendingTerms: String? = nil
    @State private var showOnboarding = PrefsManager.shared.isPaired && !PrefsManager.shared.onboardingCompleted && !Demo.isOn

    var body: some Scene {
        WindowGroup {
            Group {
                if let debug = debugSceneName {
                    debugScene(debug)
                } else if isPaired {
                    DashboardView()
                        .fullScreenCover(isPresented: $showOnboarding) {
                            OnboardingView {
                                PrefsManager.shared.onboardingCompleted = true
                                showOnboarding = false
                            }
                        }
                } else if let terms = pendingTerms {
                    TermsView(text: terms) { pendingTerms = nil }
                } else {
                    PairingView(isPaired: $isPaired)
                }
            }
            .onChange(of: isPaired) { newValue in
                if newValue {
                    onPaired()
                    showOnboarding = !PrefsManager.shared.onboardingCompleted
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: .primeKidsDidUnpair)) { _ in
                isPaired = false
            }
            .task {
                // Server-managed child terms (skipped silently when none are configured).
                guard !isPaired, !PrefsManager.shared.termsAccepted else { return }
                if let cfg = try? await APIClient.shared.fetchAppConfig(),
                   let t = cfg.termsChild, !t.isEmpty {
                    pendingTerms = t
                }
            }
            #if DEBUG
            .task {
                if let code = DebugLaunch.pairCode, !isPaired {
                    if let r = try? await APIClient.shared.completePairing(code: code) {
                        let p = PrefsManager.shared
                        p.deviceToken = r.deviceToken; p.deviceId = r.deviceId; p.childId = r.childId; p.parentId = r.parentId
                        p.onboardingCompleted = true
                        showOnboarding = false
                        isPaired = true
                    }
                }
            }
            #endif
        }
    }

    /// Non-nil only in DEBUG builds launched with `-pkScene`.
    private var debugSceneName: String? {
        #if DEBUG
        if let scene = DebugLaunch.scene, isPaired || scene == "onboarding" || scene == "pairing" { return scene }
        #endif
        return nil
    }

    @ViewBuilder
    private func debugScene(_ scene: String) -> some View {
        #if DEBUG
        switch scene {
        case "onboarding": OnboardingView(startStep: DebugLaunch.step) {}
        case "pairing": PairingView(isPaired: .constant(false))
        case "settings": NavigationView { SettingsView() }.navigationViewStyle(.stack)
        case "parent": NavigationView { ParentSettingsView() }.navigationViewStyle(.stack)
        default: DashboardView()
        }
        #else
        EmptyView()
        #endif
    }

    private func onPaired() {
        // Start services after successful pairing; permissions are requested in OnboardingView.
        WebSocketManager.shared.connect()
        BackgroundTaskManager.shared.scheduleTasks()
        Task {
            await NotificationManager.shared.registerTokenWithBackend()
            await RuleManager.shared.refreshRules()
        }
    }
}
