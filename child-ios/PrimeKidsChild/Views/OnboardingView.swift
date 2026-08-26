import SwiftUI
import UIKit

/// Post-pairing permission walkthrough (mirrors Android's OnboardingPermissionsActivity).
/// Each step explains *why* before the system prompt — Apple 5.1.1 + Play "prominent disclosure".
struct OnboardingView: View {
    @ObservedObject private var location = LocationManager.shared
    @ObservedObject private var notifications = NotificationManager.shared
    @ObservedObject private var screenTime = ScreenTimeManager.shared
    @State private var safariEnabled = false
    @State private var requesting = false
    @State private var step: Int
    let onFinished: () -> Void

    init(startStep: Int = 0, onFinished: @escaping () -> Void) {
        _step = State(initialValue: max(0, min(startStep, 3)))
        self.onFinished = onFinished
    }

    private let steps: [Step] = [.notifications, .location, .screenTime, .safari]

    var body: some View {
        VStack(spacing: 0) {
            // progress
            HStack(spacing: 6) {
                ForEach(0..<steps.count, id: \.self) { i in
                    Capsule().fill(i <= step ? Color("Primary") : Color(.systemGray4)).frame(height: 4)
                }
            }
            .padding(.horizontal, 24).padding(.top, 20)

            Spacer()

            let s = steps[step]
            Image(systemName: s.icon)
                .font(.system(size: 64))
                .foregroundColor(Color("Primary"))
                .padding(.bottom, 20)
            Text(s.title)
                .font(.title2.bold())
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Text(s.body)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .padding(.top, 8)

            if let hint = s.hint {
                Text(hint)
                    .font(.footnote)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.top, 12)
            }

            statusPill(for: s).padding(.top, 20)

            Spacer()

            // Apple 5.1.1(iv): the explanation must always lead to the system permission
            // request, with neutral button wording ("Continue") and no way to delay it.
            VStack(spacing: 12) {
                Button(action: { proceed(s) }) {
                    Text(s.primaryTitle)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity).frame(height: 52)
                        .background(Color("Primary"))
                        .foregroundColor(.white).cornerRadius(16)
                }
                .disabled(requesting)

                // Only the Safari step gets a secondary action: it opens Settings, not a
                // system permission dialog.
                if s == .safari {
                    Button(action: next) {
                        Text("Finish")
                            .fontWeight(.medium)
                            .frame(maxWidth: .infinity).frame(height: 44)
                            .foregroundColor(Color("Primary"))
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .background(Color(.systemGroupedBackground))
        .onAppear { refreshSafari() }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            refreshSafari()
            screenTime.checkAuthorization()
        }
    }

    // MARK: - Steps

    enum Step {
        case notifications, location, screenTime, safari

        var icon: String {
            switch self {
            case .notifications: return "bell.badge.fill"
            case .location: return "location.fill"
            case .screenTime: return "hourglass"
            case .safari: return "safari.fill"
            }
        }
        var title: LocalizedStringKey {
            switch self {
            case .notifications: return "Allow notifications"
            case .location: return "Share location with your parent"
            case .screenTime: return "Set up Screen Time"
            case .safari: return "Turn on Safari filtering"
            }
        }
        var body: LocalizedStringKey {
            switch self {
            case .notifications: return "Prime Kids uses notifications to confirm SOS alerts and to tell you when your parent changes a rule."
            case .location: return "Your parent can see where this device is and gets an alert if you leave a safe zone. Your location is also attached when you send an SOS."
            case .screenTime: return "Your parent will authorise Prime Kids to manage app limits and bedtime schedules on this device using Apple’s Screen Time."
            case .safari: return "The Prime Kids Safari extension blocks websites your parent has filtered. Enable it in the Settings app: Apps → Safari → Extensions → Prime Kids."
            }
        }
        var hint: LocalizedStringKey? {
            switch self {
            case .location: return "iOS will ask next how you want to share your location. You can change your choice at any time in Settings → Privacy → Location Services."
            case .screenTime: return "A parent or guardian must enter their Apple ID or device passcode."
            case .safari: return "iOS will open this app's settings page — go back to the Settings front page, then: Apps → Safari → Extensions → Prime Kids → turn it on. Filtering applies to Safari only."
            default: return nil
            }
        }
        /// Neutral wording required by App Review guideline 5.1.1(iv).
        var primaryTitle: LocalizedStringKey {
            switch self {
            case .safari: return "Open Settings"
            default: return "Continue"
            }
        }
    }

    private func isGranted(_ s: Step) -> Bool {
        switch s {
        case .notifications: return notifications.isAuthorized
        case .location: return location.isAuthorized
        case .screenTime: return screenTime.isAuthorized
        case .safari: return safariEnabled
        }
    }

    /// Shows the system permission request for this step and then moves on. The user always
    /// reaches the system dialog from the explanation screen — nothing can delay it.
    private func proceed(_ s: Step) {
        guard !requesting else { return }
        requesting = true
        switch s {
        case .notifications:
            Task {
                _ = await NotificationManager.shared.requestPermission()
                await MainActor.run { requesting = false; next() }
            }
        case .location:
            location.requestAlwaysAuthorization()
            // CoreLocation answers through its delegate; advance once the sheet is up.
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                requesting = false
                next()
            }
        case .screenTime:
            Task {
                await screenTime.requestAuthorization()
                await MainActor.run { requesting = false; next() }
            }
        case .safari:
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
            requesting = false
        }
    }

    private func next() {
        if step < steps.count - 1 { step += 1 } else { onFinished() }
    }

    private func refreshSafari() {
        Task { safariEnabled = await ContentBlockerService.shared.isEnabled() }
    }

    @ViewBuilder
    private func statusPill(for s: Step) -> some View {
        let ok = isGranted(s)
        HStack(spacing: 6) {
            Image(systemName: ok ? "checkmark.circle.fill" : "circle")
            Text(ok ? LocalizedStringKey("Done") : LocalizedStringKey("Not yet"))
        }
        .font(.caption.weight(.semibold))
        .foregroundColor(ok ? .green : .secondary)
        .padding(.horizontal, 12).padding(.vertical, 6)
        .background((ok ? Color.green : Color.secondary).opacity(0.12))
        .cornerRadius(20)
    }
}
