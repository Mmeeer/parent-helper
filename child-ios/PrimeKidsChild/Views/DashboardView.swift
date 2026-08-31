import SwiftUI
#if canImport(FamilyControls)
import FamilyControls
#endif

struct DashboardView: View {
    @ObservedObject private var ruleManager = RuleManager.shared
    @ObservedObject private var locationManager = LocationManager.shared
    @ObservedObject private var screenTimeManager = ScreenTimeManager.shared
    @ObservedObject private var notificationManager = NotificationManager.shared

    @State private var showPermissions = false
    @State private var showParent = false
    @State private var safariEnabled = false

    var body: some View {
        NavigationView { content }
        .navigationViewStyle(.stack)
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image("LogoMark")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 64, height: 64)

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

                // Restriction banner (paused / bedtime / limit)
                if let banner = restrictionBanner {
                    HStack(spacing: 12) {
                        Image(systemName: banner.icon).foregroundColor(.white)
                        Text(banner.text).font(.subheadline.weight(.semibold)).foregroundColor(.white)
                        Spacer()
                    }
                    .padding(16)
                    .background(Color("Primary"))
                    .cornerRadius(16)
                    .padding(.horizontal, 16)
                }

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

                // Parental controls (Screen Time). Kept on the first screen so the
                // Screen Time features are reachable without hunting through menus.
                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 8) {
                        Image(systemName: "lock.shield.fill").foregroundColor(Color("Primary"))
                        Text("Parental controls").font(.subheadline).fontWeight(.semibold)
                        Spacer()
                        Text(screenTimeManager.isAuthorized ? "On" : "Not set up")
                            .font(.caption).fontWeight(.semibold)
                            .foregroundColor(screenTimeManager.isAuthorized ? .green : .orange)
                    }

                    if screenTimeManager.isAuthorized {
                        VStack(spacing: 8) {
                            summaryRow("square.grid.2x2.fill", "Managed apps", managedAppsText)
                            if let limit = ruleManager.rules?.screenTime?.dailyLimitMin, limit > 0 {
                                summaryRow("hourglass", "Daily limit", "\(limit) min")
                            }
                            summaryRow("moon.zzz.fill", "Schedules", "\(ruleManager.rules?.screenTime?.schedule?.count ?? 0)")
                            summaryRow("shield.lefthalf.filled", "App blocking",
                                       AppGroup.defaults.bool(forKey: SharedKeys.blockingEnabled) ? "On" : "Off")
                        }
                        Button(action: { showParent = true }) {
                            Text("Manage apps & limits")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity).frame(height: 46)
                                .background(Color("Primary")).foregroundColor(.white).cornerRadius(14)
                        }
                    } else {
                        Text("Screen Time lets your parent limit apps, set bedtime schedules and pause this device. A parent needs to authorise it once.")
                            .font(.caption).foregroundColor(.secondary)
                        Button(action: { Task { await screenTimeManager.requestAuthorization() } }) {
                            Text("Set up Screen Time")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity).frame(height: 46)
                                .background(Color("Primary")).foregroundColor(.white).cornerRadius(14)
                        }
                        if let err = screenTimeManager.authorizationError {
                            Text(err).font(.caption2).foregroundColor(.red).fixedSize(horizontal: false, vertical: true)
                        }
                        Button(action: { showParent = true }) {
                            Text("Open parent settings").font(.footnote).foregroundColor(Color("Primary"))
                        }
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
                    statusRow(icon: "location.fill", title: "Location",
                              status: locationStatusText,
                              isActive: locationManager.level != .none)
                    Divider().padding(.leading, 48)
                    statusRow(icon: "bell.fill", title: "Notifications",
                              status: notificationManager.isAuthorized ? LocalizedStringKey("Active") : LocalizedStringKey("Off"),
                              isActive: notificationManager.isAuthorized)
                    Divider().padding(.leading, 48)
                    statusRow(icon: "hourglass", title: "Screen Time",
                              status: screenTimeManager.isAuthorized ? LocalizedStringKey("Active") : LocalizedStringKey("Not Set Up"),
                              isActive: screenTimeManager.isAuthorized)
                    Divider().padding(.leading, 48)
                    statusRow(icon: "safari.fill", title: "Safari filtering",
                              status: safariEnabled ? LocalizedStringKey("Active") : LocalizedStringKey("Off"),
                              isActive: safariEnabled)
                }
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
                .padding(.horizontal, 16)

                Spacer(minLength: 40)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Image("LogoMark").resizable().scaledToFit().frame(height: 24)
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink(destination: SettingsView()) {
                    Image(systemName: "gearshape").accessibilityLabel(Text("Settings"))
                }
            }
        }
        .fullScreenCover(isPresented: $showPermissions) {
            OnboardingView { showPermissions = false }
        }
        .sheet(isPresented: $showParent) {
            NavigationView { ParentGateView() }.navigationViewStyle(.stack)
        }
        .onAppear {
            refreshUsage()
            Task {
                await ruleManager.refreshRules()
                safariEnabled = await ContentBlockerService.shared.isEnabled()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            refreshUsage()
            Task { safariEnabled = await ContentBlockerService.shared.isEnabled() }
        }
    }

    /// "N apps · M categories" from the selection the parent picked on this device.
    private var managedAppsText: String {
        #if canImport(FamilyControls)
        let sel = screenTimeManager.selection
        return "\(sel.applicationTokens.count) apps · \(sel.categoryTokens.count) categories"
        #else
        return "—"
        #endif
    }

    private func summaryRow(_ icon: String, _ title: LocalizedStringKey, _ value: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon).frame(width: 20).foregroundColor(.secondary)
            Text(title).font(.footnote)
            Spacer()
            Text(value).font(.footnote).foregroundColor(.secondary)
        }
    }

    private struct Banner { let icon: String; let text: LocalizedStringKey }

    private var restrictionBanner: Banner? {
        let d = AppGroup.defaults
        if d.bool(forKey: SharedKeys.devicePaused) { return Banner(icon: "pause.circle.fill", text: "Your parent paused this device") }
        if d.string(forKey: SharedKeys.activeScheduleName) != nil || ruleManager.isCurrentlyBlocked { return Banner(icon: "moon.zzz.fill", text: "Quiet time — apps are limited right now") }
        if d.bool(forKey: SharedKeys.dailyLimitReached) { return Banner(icon: "hourglass.bottomhalf.filled", text: "Daily screen time limit reached") }
        return nil
    }

    private var progressColor: Color {
        let pct = Double(ruleManager.dailyUsageMin) / Double(ruleManager.rules?.screenTime?.dailyLimitMin ?? 1)
        if pct >= 1 { return .red }
        if pct >= 0.8 { return .orange }
        return Color("Primary")
    }

    /// Pull today's managed-app usage (written by the DeviceActivityMonitor extension)
    /// into the dashboard counter. 15-minute granularity — see ScreenTimeManager.
    private func refreshUsage() {
        let d = AppGroup.defaults
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        let minutes = d.string(forKey: SharedKeys.usedMinutesDate) == f.string(from: Date())
            ? d.integer(forKey: SharedKeys.usedMinutesToday) : 0
        ruleManager.updateDailyUsage(minutes: Demo.isOn ? 80 : minutes)
    }

    private var locationStatusText: LocalizedStringKey {
        switch locationManager.level {
        case .always: return "Active"
        case .whileUsing: return "While using only"
        case .none: return "Off"
        }
    }

    private var needsPermissions: Bool {
        locationManager.level == .none || !notificationManager.isAuthorized || !screenTimeManager.isAuthorized
    }

    private func statusRow(icon: String, title: LocalizedStringKey, status: LocalizedStringKey, isActive: Bool) -> some View {
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
