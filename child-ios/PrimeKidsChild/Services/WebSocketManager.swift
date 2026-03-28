import Foundation

final class WebSocketManager: ObservableObject {
    static let shared = WebSocketManager()

    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private var isConnected = false
    private var reconnectDelay: TimeInterval = 1
    private let maxReconnectDelay: TimeInterval = 30

    var onRulesUpdated: (() -> Void)?
    var onCommand: ((String) -> Void)?

    private init() {}

    func connect() {
        guard let token = PrefsManager.shared.deviceToken else { return }
        let baseURL = PrefsManager.shared.serverURL
            .replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")

        guard let url = URL(string: "\(baseURL)/socket.io/?EIO=4&transport=websocket") else { return }

        session = URLSession(configuration: .default)
        webSocket = session?.webSocketTask(with: url)
        webSocket?.resume()

        // Send join:device after connecting
        let joinMessage = """
        42["join:device","\(token)"]
        """
        send(joinMessage)

        isConnected = true
        reconnectDelay = 1
        listen()
    }

    func disconnect() {
        isConnected = false
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
    }

    private func send(_ text: String) {
        webSocket?.send(.string(text)) { error in
            if let error = error {
                print("[WebSocket] Send error: \(error.localizedDescription)")
            }
        }
    }

    private func listen() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue listening
                self.listen()

            case .failure(let error):
                print("[WebSocket] Receive error: \(error.localizedDescription)")
                self.handleDisconnect()
            }
        }
    }

    private func handleMessage(_ text: String) {
        // Socket.IO protocol: "42" prefix for event messages
        guard text.hasPrefix("42") else {
            // Handle ping/pong
            if text == "2" { send("3") } // pong
            return
        }

        let payload = String(text.dropFirst(2))

        if payload.contains("\"rules:updated\"") {
            DispatchQueue.main.async { self.onRulesUpdated?() }
        } else if payload.contains("\"command\"") {
            // Extract command action
            if let data = payload.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [Any],
               json.count >= 2,
               let commandData = json[1] as? [String: Any],
               let action = commandData["action"] as? String {
                DispatchQueue.main.async { self.onCommand?(action) }
            }
        }
    }

    private func handleDisconnect() {
        guard isConnected else { return }

        // Exponential backoff reconnect
        DispatchQueue.global().asyncAfter(deadline: .now() + reconnectDelay) { [weak self] in
            guard let self = self else { return }
            self.reconnectDelay = min(self.reconnectDelay * 2, self.maxReconnectDelay)
            self.connect()
        }
    }
}
