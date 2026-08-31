import SwiftUI

/// One tap sends the alert with the child's location. The button disables itself
/// while sending and for a few seconds after, so it cannot double-fire.
struct SOSButton: View {
    @State private var status: SOSStatus = .idle
    @State private var pressed = false

    enum SOSStatus {
        case idle, sending, sent, failed
    }

    var body: some View {
        VStack(spacing: 12) {
            Button(action: sendSOS) {
                ZStack {
                    Circle()
                        .stroke(Color.red.opacity(0.2), lineWidth: 3)
                        .frame(width: 180, height: 180)

                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.red, Color.red.opacity(0.8)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: 150, height: 150)
                        .shadow(color: .red.opacity(0.3), radius: pressed ? 20 : 10)
                        .scaleEffect(pressed ? 0.94 : 1)

                    if status == .sending {
                        ProgressView().tint(.white).scaleEffect(1.4)
                    } else if status == .sent {
                        Image(systemName: "checkmark")
                            .font(.system(size: 44, weight: .heavy))
                            .foregroundColor(.white)
                    } else {
                        Text("SOS")
                            .font(.system(size: 36, weight: .heavy))
                            .foregroundColor(.white)
                    }
                }
            }
            .buttonStyle(.plain)
            .disabled(status == .sending || status == .sent)
            .accessibilityLabel(Text("SOS"))
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in withAnimation(.easeOut(duration: 0.1)) { pressed = true } }
                    .onEnded { _ in withAnimation(.easeOut(duration: 0.2)) { pressed = false } }
            )

            Text(statusText)
                .font(.caption)
                .foregroundColor(.secondary)
                .animation(.easeInOut, value: status)
        }
    }

    private var statusText: LocalizedStringKey {
        switch status {
        case .idle: return "Tap to alert your parent"
        case .sending: return "Sending alert..."
        case .sent: return "Alert sent to your parent!"
        case .failed: return "Could not send alert. Try again."
        }
    }

    private func sendSOS() {
        guard status == .idle || status == .failed else { return }
        status = .sending
        UINotificationFeedbackGenerator().notificationOccurred(.warning)

        Task {
            LocationManager.shared.requestFreshFix()
            let location = await LocationManager.shared.getCurrentLocation()
            do {
                _ = try await APIClient.shared.sendSos(
                    lat: location?.coordinate.latitude,
                    lng: location?.coordinate.longitude
                )
                await MainActor.run { status = .sent }
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                try? await Task.sleep(nanoseconds: 5_000_000_000)
                await MainActor.run { withAnimation { status = .idle } }
            } catch {
                await MainActor.run { status = .failed }
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                await MainActor.run { withAnimation { status = .idle } }
            }
        }
    }
}
