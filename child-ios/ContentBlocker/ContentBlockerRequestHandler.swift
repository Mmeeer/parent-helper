import Foundation

/// Safari Content Blocker. Serves the rule list written by the main app
/// (`ContentBlockerService`) into the shared App Group container; falls back to the
/// bundled no-op list so the extension always loads.
final class ContentBlockerRequestHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let url = rulesURL()
        guard let attachment = NSItemProvider(contentsOf: url) else {
            context.cancelRequest(withError: NSError(domain: "PrimeKids.ContentBlocker", code: 1,
                                                     userInfo: [NSLocalizedDescriptionKey: "Rules file unreadable"]))
            return
        }
        let item = NSExtensionItem()
        item.attachments = [attachment]
        context.completeRequest(returningItems: [item], completionHandler: nil)
    }

    private func rulesURL() -> URL {
        if let container = AppGroup.containerURL {
            let shared = container.appendingPathComponent("blockerList.json")
            if FileManager.default.fileExists(atPath: shared.path) { return shared }
        }
        return Bundle.main.url(forResource: "blockerList", withExtension: "json")
            ?? FileManager.default.temporaryDirectory.appendingPathComponent("blockerList.json")
    }
}
