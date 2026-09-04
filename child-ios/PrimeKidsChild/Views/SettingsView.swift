import SwiftUI

/// Child-visible settings: status, help, legal links, and the PIN-gated Parent settings.
struct SettingsView: View {
    @ObservedObject private var location = LocationManager.shared
    @ObservedObject private var notifications = NotificationManager.shared
    @ObservedObject private var screenTime = ScreenTimeManager.shared
    @ObservedObject private var socket = WebSocketManager.shared
    @State private var showOnboarding = false
    @State private var showParent = false

    static let privacyURL = URL(string: "https://primekids.masterclass.mn/parent-helper/legal/privacy-policy.html")!
    static let termsURL = URL(string: "https://primekids.masterclass.mn/parent-helper/legal/terms-of-service.html")!
    static let supportURL = URL(string: "https://primekids.masterclass.mn/parent-helper/support.html")!

    private var webFilterOn: Bool {
        guard ScreenTimeManager.shared.isAuthorized, let wf = RuleManager.shared.rules?.webFilter else { return false }
        return wf.mode == "allowlist" || wf.categories?.isEmpty == false || wf.customBlock?.isEmpty == false
    }

    var body: some View {
        List {
            Section {
                row("bell.fill", "Notifications", notifications.isAuthorized)
                row("location.fill", "Location", location.level != .none)
                row("hourglass", "Screen Time", screenTime.isAuthorized)
                row("network.badge.shield.half.filled", "Web filtering", webFilterOn)
                Button { showOnboarding = true } label: {
                    Label("Review permissions", systemImage: "checklist")
                }
            } header: {
                Text("Protection status")
            }

            Section {
                HStack {
                    Label("Connection", systemImage: "antenna.radiowaves.left.and.right")
                    Spacer()
                    Text(socket.isConnected ? LocalizedStringKey("Live") : LocalizedStringKey("Background"))
                        .foregroundColor(.secondary)
                }
                HStack {
                    Label("Version", systemImage: "info.circle")
                    Spacer()
                    Text("\(AppConfig.appVersion) (\(AppConfig.buildNumber))").foregroundColor(.secondary)
                }
            } header: {
                Text("About")
            }

            Section {
                Link(destination: Self.privacyURL) { Label("Privacy Policy", systemImage: "hand.raised.fill") }
                Link(destination: Self.termsURL) { Label("Terms of Service", systemImage: "doc.text.fill") }
                Link(destination: Self.supportURL) { Label("Help & Support", systemImage: "questionmark.circle.fill") }
            } header: {
                Text("Legal")
            } footer: {
                Text("Prime Kids is installed and managed by your parent or guardian. Data is only visible to them.")
            }

            Section {
                Button { showParent = true } label: {
                    Label("Parent settings", systemImage: "lock.fill")
                }
            } footer: {
                Text("Requires the parent PIN. Manage which apps are limited, or unpair this device.")
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)

        .fullScreenCover(isPresented: $showOnboarding) {
            OnboardingView { showOnboarding = false }
        }
        .sheet(isPresented: $showParent) {
            NavigationView { ParentGateView() }.navigationViewStyle(.stack)
        }
    }


    private func row(_ icon: String, _ title: LocalizedStringKey, _ ok: Bool) -> some View {
        HStack {
            Label(title, systemImage: icon)
            Spacer()
            Image(systemName: ok ? "checkmark.circle.fill" : "exclamationmark.circle")
                .foregroundColor(ok ? .green : .orange)
        }
    }
}
