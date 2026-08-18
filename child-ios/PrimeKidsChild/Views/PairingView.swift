import SwiftUI

struct PairingView: View {
    @Binding var isPaired: Bool
    @State private var pairingCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var isCodeFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Brand logo
            Image("Logo")
                .resizable()
                .scaledToFit()
                .frame(height: 72)
                .padding(.bottom, 12)
                .accessibilityLabel(Text("Prime Kids"))

            Text("Enter the pairing code from your parent's app")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
                .padding(.top, 8)
                .padding(.bottom, 40)

            // Pairing code card
            VStack(spacing: 16) {
                Text("PAIRING CODE")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
                    .tracking(1)

                TextField("- - - - - - - -", text: $pairingCode)
                    .font(.system(size: 32, weight: .bold, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .keyboardType(.asciiCapable)
                    .focused($isCodeFocused)
                    .submitLabel(.go)
                    .onSubmit { if pairingCode.count >= 6 && !isLoading { pair() } }
                    .padding(.vertical, 16)
                    .background(Color(.systemGray6))
                    .cornerRadius(16)
                    .onChange(of: pairingCode) { newValue in
                        pairingCode = String(newValue.prefix(8))
                            .uppercased()
                            .filter { $0.isLetter || $0.isNumber }
                    }
            }
            .padding(24)
            .background(Color(.systemBackground))
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.06), radius: 12, y: 4)
            .padding(.horizontal, 24)

            if let error = errorMessage {
                Text(error)
                    .font(.footnote)
                    .foregroundColor(.red)
                    .padding(.top, 12)
            }

            // Pair button
            Button(action: pair) {
                HStack(spacing: 8) {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isLoading ? LocalizedStringKey("Pairing...") : LocalizedStringKey("Pair Device"))
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(pairingCode.count >= 6 ? Color("Primary") : Color(.systemGray4))
                .foregroundColor(.white)
                .cornerRadius(16)
            }
            .disabled(pairingCode.count < 6 || isLoading)
            .padding(.horizontal, 24)
            .padding(.top, 24)

            Spacer()
            Spacer()
        }
        .background(Color(.systemGroupedBackground))
        .onAppear {
            if Demo.isOn { pairingCode = "K7Q2M4X9" } else { isCodeFocused = true }
        }
    }

    private func pair() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let response = try await APIClient.shared.completePairing(code: pairingCode)

                let prefs = PrefsManager.shared
                prefs.deviceToken = response.deviceToken
                prefs.deviceId = response.deviceId
                prefs.childId = response.childId
                prefs.parentId = response.parentId

                await MainActor.run {
                    isLoading = false
                    isPaired = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}
