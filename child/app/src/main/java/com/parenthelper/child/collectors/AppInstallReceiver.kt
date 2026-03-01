package com.parenthelper.child.collectors

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.ActivitySyncRequest
import com.parenthelper.child.data.models.BlockedAttempt
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class AppInstallReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_PACKAGE_ADDED) return
        if (intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)) return

        val packageName = intent.data?.schemeSpecificPart ?: return

        val appName = try {
            val pm = context.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (_: PackageManager.NameNotFoundException) {
            packageName
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = (context.applicationContext as ParentHelperApp).prefsManager
                if (!prefs.isPaired.first()) return@launch

                val childId = prefs.childId.first() ?: return@launch
                val deviceId = prefs.deviceId.first() ?: return@launch

                val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.format(Date())

                val request = ActivitySyncRequest(
                    childId = childId,
                    deviceId = deviceId,
                    date = today,
                    apps = null,
                    web = null,
                    location = null,
                    blockedAttempts = listOf(
                        BlockedAttempt(
                            type = "new_app",
                            target = "$appName ($packageName)",
                            timestamp = now,
                        )
                    ),
                )

                ApiClient.service.syncActivity(request)
            } catch (_: Exception) {
                // Best effort — will sync on next periodic sync
            }
        }
    }
}
