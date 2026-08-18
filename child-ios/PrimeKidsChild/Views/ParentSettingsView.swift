import SwiftUI
#if canImport(FamilyControls)
import FamilyControls
#endif

/// PIN gate in front of ParentSettingsView. First use: the parent chooses a 4–6 digit PIN.
struct ParentGateView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var pin = ""
    @State private var confirm = ""
    @State private var error: LocalizedStringKey?
    @State private var unlocked = false
    @FocusState private var focused: Bool

    private var hasPin: Bool { PrefsManager.shared.parentPin != nil }

    var body: some View {
        Group {
            if unlocked {
                ParentSettingsView()
            } else {
                VStack(spacing: 20) {
                    Image(systemName: "lock.shield.fill").font(.system(size: 56)).foregroundColor(Color("Primary")).padding(.top, 32)
                    Text(hasPin ? LocalizedStringKey("Enter parent PIN") : LocalizedStringKey("Create a parent PIN"))
                        .font(.title3.bold())
                    Text(hasPin ? LocalizedStringKey("Only a parent or guardian should continue.") : LocalizedStringKey("The PIN protects these settings from being changed by the child. 4–6 digits."))
                        .font(.subheadline).foregroundColor(.secondary).multilineTextAlignment(.center).padding(.horizontal, 32)

                    SecureField("PIN", text: $pin)
                        .keyboardType(.numberPad).textContentType(.oneTimeCode)
                        .multilineTextAlignment(.center).font(.title2.monospacedDigit())
                        .padding().background(Color(.systemBackground)).cornerRadius(12).padding(.horizontal, 48)
                        .focused($focused)
                    if !hasPin {
                        SecureField("Confirm PIN", text: $confirm)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.center).font(.title2.monospacedDigit())
                            .padding().background(Color(.systemBackground)).cornerRadius(12).padding(.horizontal, 48)
                    }
                    if let error { Text(error).font(.footnote).foregroundColor(.red) }

                    Button(action: submit) {
                        Text(hasPin ? LocalizedStringKey("Unlock") : LocalizedStringKey("Save PIN")).fontWeight(.semibold)
                            .frame(maxWidth: .infinity).frame(height: 50)
                            .background(Color("Primary")).foregroundColor(.white).cornerRadius(14)
                    }
                    .padding(.horizontal, 48)

                    if hasPin {
                        Text("Forgot the PIN? Unpair the device from the parent app, then pair again.")
                            .font(.caption).foregroundColor(.secondary).multilineTextAlignment(.center).padding(.horizontal, 32)
                    }
                    Spacer()
                }
                .background(Color(.systemGroupedBackground))
                .onAppear { focused = true }
            }
        }
        .navigationTitle("Parent settings")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
    }

    private func submit() {
        let digits = pin.filter(\.isNumber)
        guard (4...6).contains(digits.count) else { error = "PIN must be 4–6 digits."; return }
        if hasPin {
            if digits == PrefsManager.shared.parentPin { unlocked = true } else { error = "Wrong PIN."; pin = "" }
        } else {
            guard digits == confirm.filter(\.isNumber) else { error = "PINs don't match."; return }
            PrefsManager.shared.parentPin = digits
            unlocked = true
        }
    }
}

/// Parent-only controls on the child device: app selection (FamilyActivityPicker), blocking status,
/// permissions, PIN change and unpair.
struct ParentSettingsView: View {
    @ObservedObject private var screenTime = ScreenTimeManager.shared
    @ObservedObject private var rules = RuleManager.shared
    @State private var showPicker = false
    @State private var showUnpair = false
    @State private var showOnboarding = false
    @State private var uploadState: LocalizedStringKey?
    @State private var newPin = ""
    #if canImport(FamilyControls)
    @State private var selection = ScreenTimeManager.shared.selection
    #endif

    var body: some View {
        List {
            Section {
                if !screenTime.isAuthorized {
                    Button { Task { await screenTime.requestAuthorization() } } label: {
                        Label("Authorise Screen Time first", systemImage: "hourglass")
                    }
                } else {
                    Button { showPicker = true } label: {
                        Label("Manage apps & categories", systemImage: "square.grid.2x2.fill")
                    }
                    #if canImport(FamilyControls)
                    HStack {
                        Text("Selected")
                        Spacer()
                        Text("\(Demo.isOn ? 12 : selection.applicationTokens.count) apps · \(Demo.isOn ? 3 : selection.categoryTokens.count) categories · \(Demo.isOn ? 2 : selection.webDomainTokens.count) sites")
                            .foregroundColor(.secondary).font(.footnote)
                    }
                    #endif
                    if let uploadState { Text(uploadState).font(.footnote).foregroundColor(.secondary) }
                }
            } header: {
                Text("Managed apps")
            } footer: {
                Text("Pick the apps and categories your rules apply to. Turn blocking, daily limits and schedules on or off from the Parent Helper app.")
            }

            Section {
                statusRow("Block selected apps", on: Demo.isOn || AppGroup.defaults.bool(forKey: SharedKeys.blockingEnabled))
                statusRow("Device paused", on: AppGroup.defaults.bool(forKey: SharedKeys.devicePaused))
                statusRow("Daily limit reached", on: AppGroup.defaults.bool(forKey: SharedKeys.dailyLimitReached))
                if let limit = rules.rules?.screenTime?.dailyLimitMin {
                    HStack { Text("Daily limit"); Spacer(); Text("\(limit) min").foregroundColor(.secondary) }
                }
                HStack { Text("Schedules"); Spacer(); Text("\(rules.rules?.screenTime?.schedule?.count ?? 0)").foregroundColor(.secondary) }
                Button { Task { await rules.refreshRules() } } label: { Label("Refresh rules now", systemImage: "arrow.clockwise") }
            } header: {
                Text("Current rules")
            }

            Section {
                Button { showOnboarding = true } label: { Label("Re-run permission setup", systemImage: "checklist") }
                HStack {
                    SecureField("New PIN (4–6 digits)", text: $newPin).keyboardType(.numberPad)
                    Button("Change") {
                        let d = newPin.filter(\.isNumber)
                        guard (4...6).contains(d.count) else { return }
                        PrefsManager.shared.parentPin = d; newPin = ""
                    }
                    .disabled(!(4...6).contains(newPin.filter(\.isNumber).count))
                }
            } header: {
                Text("Device")
            }

            Section {
                Button(role: .destructive) { showUnpair = true } label: {
                    Label("Unpair this device", systemImage: "xmark.circle.fill")
                }
            } footer: {
                Text("Removes all restrictions and returns to the pairing screen. The parent app will show the device as offline until it is unpaired there too.")
            }
        }
        .navigationTitle("Parent settings")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Unpair this device?", isPresented: $showUnpair, titleVisibility: .visible) {
            Button("Unpair", role: .destructive) { Task { await CommandHandler.unpair() } }
            Button("Cancel", role: .cancel) {}
        }
        .fullScreenCover(isPresented: $showOnboarding) { OnboardingView { showOnboarding = false } }
        #if canImport(FamilyControls)
        .familyActivityPicker(isPresented: $showPicker, selection: $selection)
        .onChange(of: selection) { newValue in
            screenTime.selection = newValue
            Task { await upload(newValue) }
        }
        #endif
    }

    #if canImport(FamilyControls)
    private func upload(_ sel: FamilyActivitySelection) async {
        guard let childId = PrefsManager.shared.childId,
              let data = try? JSONEncoder().encode(sel) else { return }
        uploadState = "Saving…"
        do {
            try await APIClient.shared.uploadIosSelection(
                childId: childId,
                blob: data.base64EncodedString(),
                appCount: sel.applicationTokens.count,
                categoryCount: sel.categoryTokens.count,
                webDomainCount: sel.webDomainTokens.count
            )
            uploadState = "Saved to the parent app."
        } catch {
            uploadState = "Saved on this device; will sync to the parent app later."
        }
    }
    #endif

    private func statusRow(_ title: LocalizedStringKey, on: Bool) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(on ? LocalizedStringKey("On") : LocalizedStringKey("Off")).foregroundColor(on ? .green : .secondary)
        }
    }
}
