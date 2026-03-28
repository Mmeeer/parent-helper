import Foundation

class ContentBlockerRequestHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let attachment = NSItemProvider(
            contentsOf: getBlockerListURL()
        )!

        let item = NSExtensionItem()
        item.attachments = [attachment]
        context.completeRequest(returningItems: [item], completionHandler: nil)
    }

    private func getBlockerListURL() -> URL {
        // Use shared App Group container for rules synced by main app
        let groupId = "group.com.primekids.child"

        if let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: groupId
        ) {
            let fileURL = containerURL.appendingPathComponent("blockerList.json")
            if FileManager.default.fileExists(atPath: fileURL.path) {
                return fileURL
            }
        }

        // Fallback to bundled default empty rules
        return Bundle.main.url(forResource: "blockerList", withExtension: "json")
            ?? createEmptyBlockerList()
    }

    private func createEmptyBlockerList() -> URL {
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent("blockerList.json")

        let emptyRules = """
        [{"action":{"type":"block"},"trigger":{"url-filter":"^$"}}]
        """

        try? emptyRules.write(to: fileURL, atomically: true, encoding: .utf8)
        return fileURL
    }
}
