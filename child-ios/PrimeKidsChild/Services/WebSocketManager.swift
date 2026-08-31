import Foundation

/// Minimal Socket.IO v4 (Engine.IO v4) client over `URLSessionWebSocketTask`.
///
/// Protocol recap (what the backend at `/socket.io` speaks):
///   server → `0{"sid":…,"pingInterval":…}`   Engine.IO open
///   client → `40`                             Socket.IO connect (default namespace)
///   server → `40{"sid":…}`                    connected → we emit `42["join:device", token]`
///   server → `2` ping, client → `3` pong
///   server → `42["event", payload]`           events: rules:updated · command · device:unpaired · app:unsuspend · error
///
/// iOS suspends the socket in background; commands are also delivered by FCM silent push
/// and the REST poll (see CommandHandler), so this is only the low-latency path while foregrounded.
final class WebSocketManager: ObservableObject {
    static let shared = WebSocketManager()

    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private var shouldStayConnected = false
    private var reconnectDelay: TimeInterval = 1
    private let maxReconnectDelay: TimeInterval = 60
    private var reconnectWorkItem: DispatchWorkItem?

    @Published private(set) var isConnected = false

    var onRulesUpdated: (() -> Void)?
    var onCommand: ((String, [String: Any]?) -> Void)?
    var onUnpaired: (() -> Void)?

    private init() {}

    // MARK: - Lifecycle

    func connect() {
        guard PrefsManager.shared.deviceToken != nil else { return }
        shouldStayConnected = true
        reconnectWorkItem?.cancel()
        open()
    }

    func disconnect() {
        shouldStayConnected = false
        reconnectWorkItem?.cancel()
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        setConnected(false)
    }

    private func open() {
        guard shouldStayConnected else { return }
        var base = PrefsManager.shared.serverURL
        if base.hasSuffix("/") { base.removeLast() }
        let wsBase = base
            .replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        guard let url = URL(string: "\(wsBase)/socket.io/?EIO=4&transport=websocket") else { return }

        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        session = URLSession(configuration: config)
        webSocket = session?.webSocketTask(with: url)
        webSocket?.resume()
        listen()
    }

    // MARK: - IO

    private func send(_ text: String) {
        webSocket?.send(.string(text)) { error in
            if let error { print("[WebSocket] send error: \(error.localizedDescription)") }
        }
    }

    private func listen() {
        webSocket?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text): self.handle(text)
                case .data(let data): if let text = String(data: data, encoding: .utf8) { self.handle(text) }
                @unknown default: break
                }
                self.listen()
            case .failure(let error):
                print("[WebSocket] receive error: \(error.localizedDescription)")
                self.handleDisconnect()
            }
        }
    }

    private func handle(_ text: String) {
        // Engine.IO packet types: 0 open, 2 ping, 4 message (followed by Socket.IO packet type)
        if text.hasPrefix("0") {                       // open → connect to default namespace
            send("40")
            return
        }
        if text == "2" { send("3"); return }           // ping → pong
        guard text.hasPrefix("4") else { return }

        let sioPacket = text.dropFirst()               // "0{…}" connected, "2[…]" event, "4…" error
        if sioPacket.hasPrefix("0") {                  // Socket.IO connected
            setConnected(true)
            reconnectDelay = 1
            if let token = PrefsManager.shared.deviceToken,
               let data = try? JSONSerialization.data(withJSONObject: ["join:device", token]),
               let json = String(data: data, encoding: .utf8) {
                send("42\(json)")
            }
            return
        }
        guard sioPacket.hasPrefix("2") else { return } // event
        let payload = sioPacket.dropFirst()
        guard let data = payload.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [Any],
              let event = arr.first as? String else { return }
        let body = arr.count > 1 ? arr[1] as? [String: Any] : nil
        dispatch(event: event, body: body)
    }

    private func dispatch(event: String, body: [String: Any]?) {
        switch event {
        case "rules:updated":
            DispatchQueue.main.async { self.onRulesUpdated?() }
        case "command":
            // Backend: io.to(room).emit('command', { command, params })
            if let cmd = (body?["command"] as? String) ?? (body?["action"] as? String) {
                let p = body?["params"] as? [String: Any]
                DispatchQueue.main.async { self.onCommand?(cmd, p) }
            }
        case "device:unpaired":
            DispatchQueue.main.async { self.onUnpaired?() }
        case "app:unsuspend":
            break // Android-only concept
        case "error":
            print("[WebSocket] server error: \(body?["message"] as? String ?? "?")")
        default:
            break
        }
    }

    // MARK: - Reconnect

    private func handleDisconnect() {
        setConnected(false)
        webSocket = nil
        guard shouldStayConnected else { return }
        let delay = reconnectDelay
        reconnectDelay = min(reconnectDelay * 2, maxReconnectDelay)
        let work = DispatchWorkItem { [weak self] in self?.open() }
        reconnectWorkItem = work
        DispatchQueue.global().asyncAfter(deadline: .now() + delay, execute: work)
    }

    private func setConnected(_ value: Bool) {
        DispatchQueue.main.async { self.isConnected = value }
    }
}
