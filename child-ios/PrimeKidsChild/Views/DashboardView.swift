import SwiftUI

struct DashboardView: View {
    @ObservedObject private var ruleManager = RuleManager.shared
    @ObservedObject private var locationManager = LocationManager.shared
    @ObservedObject private var screenTimeManager = ScreenTimeManager.shared
    @ObservedObject private var notificationManager = NotificationManager.shared

    @State private var showPermissions = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "shield.checkered")
                        .font(.system(size: 48))
                        .foregroundColor(Color("Primary"))

                    Text("Device Protected")
                        .font(.headline)
                        .foregroundColor(Color(.label))

                    HStack(spacing: 6) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                        Text("Monitoring Active")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(20)
                }
                .padding(.top, 20)

                // SOS Button
                SOSButton()
                    .padding(.vertical, 8)

                // Screen Time Card
                VStack(spacing: 12) {
                    HStack {
                        Image(systemName: "hourglass")
                            .foregroundColor(Color("Primary"))
                        Text("Screen Time")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        Spacer()
                    }

                    HStack(alignment: .firstTextBaseline) {
                        Text(formatMinutes(ruleManager.dailyUsageMin))
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundColor(Color(.label))

                        Spacer()

                        if let limit = ruleManager.rules?.screenTime?.dailyLimitMin {
                            VStack(alignment: .trailing) {
                                Text("Daily limit")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                Text(formatMinutes(limit))
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(ruleManager.isDailyLimitExceeded ? .red : .secondary)
                            }
                        }
                    }

                    // Progress bar
                    if let limit = ruleManager.rules?.screenTime?.dailyLimitMin, limit > 0 {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color(.systemGray5))
                                    .frame(height: 6)

                                RoundedRectangle(cornerRadius: 4)
                                    .fill(progressColor)
                                    .frame(
                                        width: min(geo.size.width * CGFloat(ruleManager.dailyUsageMin) / CGFloat(limit), geo.size.width),
                                        height: 6
                                    )
                            }
                        }
                        .frame(height: 6)
                    }
                }
                .padding(20)
                .background(Color(.systemBackground))
                .cornerRadius(20)
                .shadow(color: .black.opacity(0.06), radius: 12, y: 4)
                .padding(.horizontal, 16)

                // Permissions Card
                if needsPermissions {
                    Button(action: { showPermissions = true }) {
                        HStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Permissions Needed")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(Color(.label))
                                Text("Tap to grant required permissions")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(16)
                        .background(Color(.systemBackground))
                        .cornerRadius(16)
                        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
                    }
                    .padding(.horizontal, 16)
                }

                // Status items
                VStack(spacing: 0) {
                    statusRow(
                        icon: "location.fill",
                        title: "Location",
                        status: locationManager.isAuthorized ? "Active" : "Off",
                        isActive: locationManager.isAuthorized
                    )
                    Divider().padding(.leading, 48)
                    statusRow(
                        icon: "bell.fill",
                        title: "Notifications",
                        status: notificationManager.isAuthorized ? "Active" : "Off",
                        isActive: notificationManager.isAuthorized
                    )
                    Divider().padding(.leading, 48)
                    statusRow(
                        icon: "hourglass",
                        title: "Screen Time",
                        status: screenTimeManager.isAuthorized ? "Active" : "Not Set Up",
                        isActive: screenTimeManager.isAuthorized
                    )
                }
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
                .padding(.horizontal, 16)

                Spacer(minLength: 40)
            }
        }
        .background(Color(.systemGroupedBackground))
        .sheet(isPresented: $showPermissions) {
            PermissionsSheet()
        }
        .onAppear {
            Task {
                await ruleManager.refreshRules()
            }
        }
    }

    private var progressColor: Color {
        let pct = Double(ruleManager.dailyUsageMin) / Double(ruleManager.rules?.screenTime?.dailyLimitMin ?? 1)
        if pct >= 1 { return .red }
        if pct >= 0.8 { return .orange }
        return Color("Primary")
    }

    private var needsPermissions: Bool {
        !locationManager.isAuthorized || !notificationManager.isAuthorized
    }

    private func statusRow(icon: String, title: String, status: String, isActive: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .frame(width: 24)
                .foregroundColor(isActive ? Color("Primary") : .secondary)
            Text(title)
                .font(.subheadline)
            Spacer()
            Text(status)
                .font(.caption)
                .foregroundColor(isActive ? .green : .secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func formatMinutes(_ min: Int) -> String {
        let h = min / 60
        let m = min % 60
        if h > 0 { return "\(h)h \(m)m" }
        return "\(m)m"
    }
}

// MARK: - Permissions Sheet

struct PermissionsSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section {
                    Button {
                        LocationManager.shared.requestAlwaysAuthorization()
                    } label: {
                        Label("Location (Always)", systemImage: "location.fill")
                    }

                    Button {
                        Task { await NotificationManager.shared.requestPermission() }
                    } label: {
                        Label("Notifications", systemImage: "bell.fill")
                    }

                    Button {
                        Task { await ScreenTimeManager.shared.requestAuthorization() }
                    } label: {
                        Label("Screen Time", systemImage: "hourglass")
                    }
                } header: {
                    Text("Required Permissions")
                } footer: {
                    Text("These permissions allow Prime Kids to monitor and protect this device.")
                }
            }
            .navigationTitle("Permissions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
