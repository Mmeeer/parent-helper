import SwiftUI
#if canImport(FamilyControls)
import FamilyControls
#endif

/// Parent-PIN-gated management of blocking groups and per-app limits.
/// Tokens never leave the device; only names/counts/minutes sync to the parent app.
struct GroupsAndLimitsView: View {
    @State private var groups = SharedStore.loadGroups()
    @State private var limits = SharedStore.loadLimits()
    @State private var newName = ""
    @State private var addingKind: Kind?
    @State private var editingSelectionFor: String?
    #if canImport(FamilyControls)
    @State private var pickerSelection = FamilyActivitySelection()
    #endif
    @State private var showPicker = false

    enum Kind { case group, limit }

    var body: some View {
        List {
            Section {
                ForEach($groups) { $group in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(group.name).font(.subheadline)
                            Text(countLabel(group.selectionData)).font(.caption2).foregroundColor(.secondary)
                        }
                        Spacer()
                        Toggle("", isOn: $group.enabled).labelsHidden()
                    }
                    .contentShape(Rectangle())
                    .onTapGesture { beginEditSelection(id: group.id, data: group.selectionData) }
                }
                .onDelete { groups.remove(atOffsets: $0); persist() }
                Button { addingKind = .group } label: {
                    Label("Add blocking group", systemImage: "plus.circle.fill")
                }
            } header: {
                Text("Blocking groups")
            } footer: {
                Text("Name a set of apps (Games, Social…), then switch each group on or off from the parent app — from anywhere.")
            }

            Section {
                ForEach($limits) { $rule in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(rule.name).font(.subheadline)
                            Text(countLabel(rule.selectionData)).font(.caption2).foregroundColor(.secondary)
                        }
                        Spacer()
                        Menu("\(rule.limitMin) min") {
                            ForEach([15, 30, 45, 60, 90, 120, 180], id: \.self) { m in
                                Button("\(m) min") { rule.limitMin = m; persist() }
                            }
                        }
                        .font(.footnote)
                        Toggle("", isOn: $rule.enabled).labelsHidden()
                    }
                    .contentShape(Rectangle())
                    .onTapGesture { beginEditSelection(id: rule.id, data: rule.selectionData) }
                }
                .onDelete { limits.remove(atOffsets: $0); persist() }
                Button { addingKind = .limit } label: {
                    Label("Add time limit", systemImage: "plus.circle.fill")
                }
            } header: {
                Text("Daily time limits")
            } footer: {
                Text("When the daily allowance for a set of apps is used up, just those apps are shielded until tomorrow. Minutes can also be changed from the parent app.")
            }
        }
        .navigationTitle("Apps & limits")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: groups.map(\.enabled)) { _ in persist() }
        .onChange(of: limits.map(\.enabled)) { _ in persist() }
        .alert("Name", isPresented: Binding(get: { addingKind != nil }, set: { if !$0 { addingKind = nil } })) {
            TextField("e.g. Games", text: $newName)
            Button("Next") { startPickerForNew() }
            Button("Cancel", role: .cancel) { newName = ""; addingKind = nil }
        } message: {
            Text(addingKind == .group ? "What should this blocking group be called?" : "What should this limit be called?")
        }
        #if canImport(FamilyControls)
        .familyActivityPicker(isPresented: $showPicker, selection: $pickerSelection)
        .onChange(of: showPicker) { open in
            if !open { finishPicker() }
        }
        #endif
    }

    // MARK: -

    private func countLabel(_ data: Data) -> String {
        #if canImport(FamilyControls)
        let sel = ShieldUnion.decode(data)
        return "\(sel.applicationTokens.count) apps · \(sel.categoryTokens.count) categories"
        #else
        return ""
        #endif
    }

    private func beginEditSelection(id: String, data: Data) {
        #if canImport(FamilyControls)
        editingSelectionFor = id
        pickerSelection = ShieldUnion.decode(data)
        showPicker = true
        #endif
    }

    private func startPickerForNew() {
        #if canImport(FamilyControls)
        guard !newName.trimmingCharacters(in: .whitespaces).isEmpty else { addingKind = nil; return }
        editingSelectionFor = nil
        pickerSelection = FamilyActivitySelection()
        showPicker = true
        #endif
    }

    private func finishPicker() {
        #if canImport(FamilyControls)
        guard let data = try? JSONEncoder().encode(pickerSelection) else { cleanupPicker(); return }
        if let editing = editingSelectionFor {
            if let i = groups.firstIndex(where: { $0.id == editing }) { groups[i].selectionData = data }
            if let i = limits.firstIndex(where: { $0.id == editing }) { limits[i].selectionData = data }
        } else if let kind = addingKind {
            let name = newName.trimmingCharacters(in: .whitespaces)
            if !name.isEmpty, !(pickerSelection.applicationTokens.isEmpty && pickerSelection.categoryTokens.isEmpty) {
                switch kind {
                case .group: groups.append(BlockGroup(id: UUID().uuidString, name: name, selectionData: data, enabled: true))
                case .limit: limits.append(LimitRule(id: UUID().uuidString, name: name, selectionData: data, limitMin: 60, enabled: true))
                }
            }
        }
        persist()
        cleanupPicker()
        #endif
    }

    private func cleanupPicker() {
        newName = ""; addingKind = nil; editingSelectionFor = nil
    }

    private func persist() {
        SharedStore.saveGroups(groups)
        SharedStore.saveLimits(limits)
        ScreenTimeManager.shared.applyCurrentState()
        if let rules = RuleManager.shared.rules { ScreenTimeManager.shared.applyRules(rules) }
        Task { await StructureUploader.uploadNow() }
    }
}

/// Uploads group/limit metadata (never tokens) so the parent app can mirror and edit them.
enum StructureUploader {
    static func uploadNow() async {
        guard let childId = PrefsManager.shared.childId else { return }
        #if canImport(FamilyControls)
        func meta(_ data: Data) -> (Int, Int) {
            let s = ShieldUnion.decode(data)
            return (s.applicationTokens.count, s.categoryTokens.count)
        }
        let groups = SharedStore.loadGroups().map { g -> [String: Any] in
            let (a, c) = meta(g.selectionData)
            return ["id": g.id, "name": g.name, "appCount": a, "categoryCount": c, "enabled": g.enabled]
        }
        let limits = SharedStore.loadLimits().map { r -> [String: Any] in
            let (a, c) = meta(r.selectionData)
            return ["id": r.id, "name": r.name, "appCount": a, "categoryCount": c, "limitMin": r.limitMin, "enabled": r.enabled]
        }
        try? await APIClient.shared.uploadIosStructure(childId: childId, groups: groups, limits: limits)
        #endif
    }
}
