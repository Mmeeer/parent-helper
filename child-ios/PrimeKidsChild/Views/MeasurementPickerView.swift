import SwiftUI
#if canImport(FamilyControls)
import FamilyControls
#endif

/// Chooses which apps count toward the screen-time figure. Selecting every category
/// makes the figure approximate total device usage.
struct MeasurementPickerView: View {
    @ObservedObject private var screenTime = ScreenTimeManager.shared
    @State private var showPicker = false
    #if canImport(FamilyControls)
    @State private var sel = ScreenTimeManager.shared.measurementSelection
    #endif

    var body: some View {
        List {
            Section {
                #if canImport(FamilyControls)
                HStack {
                    Text("Measured now")
                    Spacer()
                    Text("\(sel.applicationTokens.count) apps · \(sel.categoryTokens.count) categories")
                        .font(.footnote).foregroundColor(.secondary)
                }
                #endif
                Button { showPicker = true } label: {
                    Label("Choose what to measure", systemImage: "square.grid.2x2")
                }
            } footer: {
                Text("Select every row under Categories to measure (almost) all device usage — this is the recommended setup. The figure updates in 5-minute steps and is reported to the parent app.")
            }
        }
        .navigationTitle("Screen-time measurement")
        .navigationBarTitleDisplayMode(.inline)
        #if canImport(FamilyControls)
        .familyActivityPicker(isPresented: $showPicker, selection: $sel)
        .onChange(of: showPicker) { open in
            if !open { screenTime.measurementSelection = sel }
        }
        #endif
    }
}
