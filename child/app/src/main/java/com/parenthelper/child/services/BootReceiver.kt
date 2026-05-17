package com.parenthelper.child.services

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.enforcement.LockScreenOverlay
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val pendingResult = goAsync()
            val app = context.applicationContext as ParentHelperApp
            val prefs = app.prefsManager

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val isPaired = prefs.isPaired.first()
                    if (!isPaired) return@launch

                    Log.d(TAG, "Boot completed — starting MonitoringService")

                    val serviceIntent = Intent(context, MonitoringService::class.java)
                    ContextCompat.startForegroundService(context, serviceIntent)

                    val remoteLocked = prefs.isRemoteLocked.first()
                    if (remoteLocked) {
                        val detail = prefs.overlayDetail.first() ?: "Ask your parent to unlock"
                        LockScreenOverlay.show(context, LockScreenOverlay.Reason.REMOTE_LOCK, detail)
                        MonitoringService.isDeviceLocked = true
                        Log.d(TAG, "Restored remote lock overlay after boot")
                    }
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
