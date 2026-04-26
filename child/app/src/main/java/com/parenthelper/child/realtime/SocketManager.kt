package com.parenthelper.child.realtime

import android.util.Log
import com.google.gson.Gson
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.data.models.Command
import com.parenthelper.child.enforcement.AppBlocker
import com.parenthelper.child.enforcement.RuleManager
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.net.URI

object SocketManager {

    private const val TAG = "SocketManager"
    private var socket: Socket? = null
    private val gson = Gson()
    private var commandHandler: ((Command) -> Unit)? = null

    fun connect(deviceToken: String) {
        // Prevent multiple connections
        if (socket?.connected() == true) {
            Log.d(TAG, "Already connected, skipping")
            return
        }
        // Clean up any existing socket before creating a new one
        socket?.disconnect()
        socket?.off()
        socket = null

        try {
            val baseUrl = kotlinx.coroutines.runBlocking {
                ParentHelperApp.instance.prefsManager.baseUrl.first()
            }.trimEnd('/')

            Log.d(TAG, "Connecting to: $baseUrl with token: ${deviceToken.take(8)}...")

            // Socket.io defaults its path to "/socket.io" at the URL host root.
            // When baseUrl has a prefix (reverse-proxy at "/parent-helper"), we
            // strip that prefix off the URI and feed it to `path` explicitly.
            val parsed = URI.create(baseUrl)
            val prefixPath = parsed.rawPath?.trimEnd('/') ?: ""
            val origin = if (prefixPath.isEmpty()) {
                baseUrl
            } else {
                "${parsed.scheme}://${parsed.authority}"
            }

            val options = IO.Options().apply {
                reconnection = true
                reconnectionAttempts = Int.MAX_VALUE
                reconnectionDelay = 1000
                reconnectionDelayMax = 30000
                timeout = 20000
                transports = arrayOf("websocket", "polling")
                path = if (prefixPath.isEmpty()) "/socket.io" else "$prefixPath/socket.io"
            }

            socket = IO.socket(URI.create(origin), options)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Connected to server, joining device room...")
                socket?.emit("join:device", deviceToken)
            }

            socket?.on(Socket.EVENT_DISCONNECT) { args ->
                Log.d(TAG, "Disconnected from server: ${args.firstOrNull()}")
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e(TAG, "Connection error: ${args.firstOrNull()}")
            }

            // Listen for rule updates
            socket?.on("rules:updated") { args ->
                Log.d(TAG, "Rules updated, re-fetching...")
                CoroutineScope(Dispatchers.IO).launch {
                    val childId = ParentHelperApp.instance.prefsManager.childId.first()
                    if (childId != null) {
                        RuleManager.fetchRules(childId)
                    }
                }
            }

            // Listen for app unsuspend (parent approved a new app)
            socket?.on("app:unsuspend") { args ->
                val data = args.firstOrNull()?.toString() ?: return@on
                try {
                    val parsed = gson.fromJson(data, Map::class.java)
                    val packageName = parsed["packageName"]?.toString() ?: return@on
                    Log.d(TAG, "Unsuspending approved app: $packageName")
                    val context = ParentHelperApp.instance.applicationContext
                    val blocker = AppBlocker(context)
                    blocker.unsuspendApps(listOf(packageName))
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to unsuspend app", e)
                }
            }

            // Listen for commands from parent
            socket?.on("command") { args ->
                val data = args.firstOrNull()?.toString() ?: return@on
                try {
                    val command = gson.fromJson(data, Command::class.java)
                    Log.d(TAG, "Received command: ${command.command}")
                    handleCommand(command)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse command", e)
                }
            }

            // Listen for errors
            socket?.on("error") { args ->
                Log.e(TAG, "Server error: ${args.firstOrNull()}")
            }

            socket?.connect()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect socket", e)
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
    }

    fun isConnected(): Boolean {
        return socket?.connected() == true
    }

    fun setCommandHandler(handler: (Command) -> Unit) {
        commandHandler = handler
    }

    private fun handleCommand(command: Command) {
        when (command.command) {
            "lock" -> {
                // Bring our app to front to lock device
                commandHandler?.invoke(command)
            }
            "unlock" -> {
                commandHandler?.invoke(command)
            }
            "locate" -> {
                // Trigger immediate location report
                commandHandler?.invoke(command)
            }
            "sync" -> {
                // Trigger immediate activity sync
                commandHandler?.invoke(command)
            }
        }
    }
}
