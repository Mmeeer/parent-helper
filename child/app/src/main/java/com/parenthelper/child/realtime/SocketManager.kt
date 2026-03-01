package com.parenthelper.child.realtime

import android.util.Log
import com.google.gson.Gson
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.data.models.Command
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
        try {
            val baseUrl = kotlinx.coroutines.runBlocking {
                ParentHelperApp.instance.prefsManager.baseUrl.first()
            }.trimEnd('/')

            val options = IO.Options().apply {
                reconnection = true
                reconnectionAttempts = Int.MAX_VALUE
                reconnectionDelay = 1000
                reconnectionDelayMax = 30000
                timeout = 20000
            }

            socket = IO.socket(URI.create(baseUrl), options)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Connected to server")
                socket?.emit("join:device", deviceToken)
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "Disconnected from server")
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
