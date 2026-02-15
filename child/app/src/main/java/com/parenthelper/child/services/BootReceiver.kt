package com.parenthelper.child.services

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.parenthelper.child.ParentHelperApp
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val isPaired = runBlocking {
                (context.applicationContext as ParentHelperApp).prefsManager.isPaired.first()
            }

            if (isPaired) {
                val serviceIntent = Intent(context, MonitoringService::class.java)
                ContextCompat.startForegroundService(context, serviceIntent)
            }
        }
    }
}
