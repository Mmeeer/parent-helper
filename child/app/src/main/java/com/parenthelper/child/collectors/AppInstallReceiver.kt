package com.parenthelper.child.collectors

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.ActivitySyncRequest
import com.parenthelper.child.data.models.BlockedAttempt
import com.parenthelper.child.enforcement.AppBlocker
import com.parenthelper.child.enforcement.RuleManager
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

        // Skip our own app and system apps
        if (packageName == context.packageName) return
        if (packageName.startsWith("com.android.")) return

        val appName = try {
            val pm = context.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (_: PackageManager.NameNotFoundException) {
            packageName
        }

        Log.d(TAG, "New app installed: $appName ($packageName)")

        // Immediately suspend the new app until parent approves
        try {
            val blocker = AppBlocker(context)
            blocker.syncSuspendedApps(listOf(packageName))
            Log.d(TAG, "Auto-suspended new app: $packageName")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to auto-suspend: ${e.message}")
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

                // Notify backend — sends appName and packageName separately
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
                            target = appName,
                            timestamp = now,
                        )
                    ),
                )
                ApiClient.service.syncActivity(request)

                // Re-sync installed apps list
                val allApps = InstalledAppsCollector.getInstalledApps(context)
                val syncRequest = com.parenthelper.child.data.models.InstalledAppsSyncRequest(
                    apps = allApps.map { com.parenthelper.child.data.models.InstalledAppEntry(it.packageName, it.appName) }
                )
                ApiClient.service.syncInstalledApps(syncRequest)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to notify backend: ${e.message}")
            }
        }
    }

    companion object {
        private const val TAG = "AppInstallReceiver"
    }
}
