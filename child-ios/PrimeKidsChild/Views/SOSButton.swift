import SwiftUI

struct SOSButton: View {
    @State private var isHolding = false
    @State private var holdProgress: CGFloat = 0
    @State private var status: SOSStatus = .idle
    @State private var pulseScale: CGFloat = 1

    private let holdDuration: TimeInterval = 2.0
    private let timer = Timer.publish(every: 0.05, on: .main, in: .common).autoconnect()

    enum SOSStatus {
        case idle, holding, sending, sent, failed
    }

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                // Pulse ring
                Circle()
                    .stroke(Color.red.opacity(0.2), lineWidth: 3)
                    .frame(width: 180, height: 180)
                    .scaleEffect(pulseScale)
                    .opacity(isHolding ? 1 : 0)

                // Progress ring
                Circle()
                    .trim(from: 0, to: holdProgress)
                    .stroke(Color.red, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .frame(width: 170, height: 170)
                    .rotationEffect(.degrees(-90))

                // Main button
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.red, Color.red.opacity(0.8)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: 150, height: 150)
                    .shadow(color: .red.opacity(0.3), radius: isHolding ? 20 : 10)
                    .scaleEffect(isHolding ? 0.95 : 1)

                VStack(spacing: 4) {
                    Text("SOS")
                        .font(.system(size: 36, weight: .heavy))
                        .foregroundColor(.white)
                }
            }

            Text(statusText)
                .font(.caption)
                .foregroundColor(.secondary)
                .animation(.easeInOut, value: status)
        }
        .onLongPressGesture(minimumDuration: holdDuration, pressing: { pressing in
            if pressing {
                startHold()
            } else {
                cancelHold()
            }
        }, perform: {
            sendSOS()
        })
        .onReceive(timer) { _ in
            guard isHolding else { return }
            withAnimation(.linear(duration: 0.05)) {
                holdProgress = min(holdProgress + 0.05 / holdDuration, 1)
                pulseScale = 1 + 0.1 * sin(holdProgress * .pi * 4)
            }
        }
    }

    private var statusText: String {
        switch status {
        case .idle: return "Hold to alert your parent"
        case .holding: return "Keep holding..."
        case .sending: return "Sending alert..."
        case .sent: return "Alert sent to your parent!"
        case .failed: return "Could not send alert. Try again."
        }
    }

    private func startHold() {
        isHolding = true
        holdProgress = 0
        status = .holding
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    private func cancelHold() {
        isHolding = false
        holdProgress = 0
        if status == .holding { status = .idle }
    }

    private func sendSOS() {
        isHolding = false
        holdProgress = 1
        status = .sending
        UINotificationFeedbackGenerator().notificationOccurred(.warning)

        Task {
            let location = await LocationManager.shared.getCurrentLocation()
            do {
                _ = try await APIClient.shared.sendSos(
                    lat: location?.coordinate.latitude,
                    lng: location?.coordinate.longitude
                )
                await MainActor.run { status = .sent }
                UINotificationFeedbackGenerator().notificationOccurred(.success)

                // Reset after 5 seconds
                try? await Task.sleep(nanoseconds: 5_000_000_000)
                await MainActor.run {
                    withAnimation { status = .idle; holdProgress = 0 }
                }
            } catch {
                await MainActor.run { status = .failed }
                UINotificationFeedbackGenerator().notificationOccurred(.error)

                try? await Task.sleep(nanoseconds: 3_000_000_000)
                await MainActor.run {
                    withAnimation { status = .idle; holdProgress = 0 }
                }
            }
        }
    }
}
