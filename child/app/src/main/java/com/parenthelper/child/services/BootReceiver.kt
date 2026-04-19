package com.parenthelper.child.services

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.enforcement.LockScreenOverlay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val app = context.applicationContext as ParentHelperApp
            val prefs = app.prefsManager

            val isPaired = runBlocking { prefs.isPaired.first() }
            if (!isPaired) return

            Log.d(TAG, "Boot completed — starting MonitoringService")

            // Start the monitoring service immediately
            val serviceIntent = Intent(context, MonitoringService::class.java)
            ContextCompat.startForegroundService(context, serviceIntent)

            // Restore remote lock overlay immediately (don't wait for service init)
            val remoteLocked = runBlocking { prefs.isRemoteLocked.first() }
            if (remoteLocked) {
                val detail = runBlocking { prefs.overlayDetail.first() } ?: "Ask your parent to unlock"
                LockScreenOverlay.show(context, LockScreenOverlay.Reason.REMOTE_LOCK, detail)
                MonitoringService.isDeviceLocked = true
                Log.d(TAG, "Restored remote lock overlay after boot")
            }
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
