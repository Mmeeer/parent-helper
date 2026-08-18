import SwiftUI
import UIKit

/// Post-pairing permission walkthrough (mirrors Android's OnboardingPermissionsActivity).
/// Each step explains *why* before the system prompt — Apple 5.1.1 + Play "prominent disclosure".
struct OnboardingView: View {
    @ObservedObject private var location = LocationManager.shared
    @ObservedObject private var notifications = NotificationManager.shared
    @ObservedObject private var screenTime = ScreenTimeManager.shared
    @State private var safariEnabled = false
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

            VStack(spacing: 12) {
                Button(action: { grant(s) }) {
                    Text(isGranted(s) ? LocalizedStringKey("Granted") : s.buttonTitle)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity).frame(height: 52)
                        .background(isGranted(s) ? Color(.systemGray4) : Color("Primary"))
                        .foregroundColor(.white).cornerRadius(16)
                }
                .disabled(isGranted(s))

                Button(action: next) {
                    Text(step == steps.count - 1 ? LocalizedStringKey("Finish") : (isGranted(s) ? LocalizedStringKey("Continue") : LocalizedStringKey("Skip for now")))
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity).frame(height: 44)
                        .foregroundColor(Color("Primary"))
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
            case .location: return "Your parent can see where this device is and gets an alert if you leave a safe zone. Choose “Always Allow” so it keeps working when the app is closed."
            case .screenTime: return "Your parent will authorise Prime Kids to manage app limits and bedtime schedules on this device using Apple’s Screen Time."
            case .safari: return "The Prime Kids Safari extension blocks websites your parent has filtered. Enable it in Settings → Safari → Extensions."
            }
        }
        var hint: LocalizedStringKey? {
            switch self {
            case .location: return "If iOS only offers “While Using”, allow it now — you can change it to “Always” in Settings → Privacy → Location Services → Prime Kids."
            case .screenTime: return "A parent or guardian must enter their Apple ID or device passcode."
            case .safari: return "Filtering applies to Safari only. Other browsers are not filtered on iPhone."
            default: return nil
            }
        }
        var buttonTitle: LocalizedStringKey {
            switch self {
            case .notifications: return "Allow notifications"
            case .location: return "Allow location"
            case .screenTime: return "Authorise Screen Time"
            case .safari: return "Open Settings"
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

    private func grant(_ s: Step) {
        switch s {
        case .notifications:
            Task { _ = await NotificationManager.shared.requestPermission() }
        case .location:
            location.requestAlwaysAuthorization()
        case .screenTime:
            Task { await screenTime.requestAuthorization() }
        case .safari:
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
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
