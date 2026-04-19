package com.parenthelper.child.collectors

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
        val packageName = intent.data?.schemeSpecificPart ?: return

        when (intent.action) {
            Intent.ACTION_PACKAGE_ADDED -> {
                if (intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)) return
                handleNewInstall(context, packageName)
            }
            Intent.ACTION_PACKAGE_REMOVED -> {
                if (intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)) return
                handleUninstall(context, packageName)
            }
        }
    }

    private fun handleNewInstall(context: Context, packageName: String) {
        // Skip our own app and core system packages
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

                // Notify backend with both appName and packageName for the approval flow
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
                            packageName = packageName,
                        )
                    ),
                )
                ApiClient.service.syncActivity(request)
                Log.d(TAG, "Sent new_app alert for $appName ($packageName)")

                // Re-sync installed apps list so backend has the full picture
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

    private fun handleUninstall(context: Context, packageName: String) {
        if (packageName == context.packageName) return
        if (packageName.startsWith("com.android.")) return

        Log.d(TAG, "App uninstalled: $packageName")

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = (context.applicationContext as ParentHelperApp).prefsManager
                if (!prefs.isPaired.first()) return@launch

                // Re-sync installed apps list so backend stays up-to-date
                val allApps = InstalledAppsCollector.getInstalledApps(context)
                val syncRequest = com.parenthelper.child.data.models.InstalledAppsSyncRequest(
                    apps = allApps.map { com.parenthelper.child.data.models.InstalledAppEntry(it.packageName, it.appName) }
                )
                ApiClient.service.syncInstalledApps(syncRequest)
                Log.d(TAG, "Re-synced installed apps after uninstall")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to re-sync after uninstall: ${e.message}")
            }
        }
    }

    companion object {
        private const val TAG = "AppInstallReceiver"

        /**
         * Creates an IntentFilter for dynamic registration in MonitoringService.
         * This serves as a backup in case the static manifest receiver is killed by the OS.
         */
        fun createIntentFilter(): IntentFilter {
            return IntentFilter().apply {
                addAction(Intent.ACTION_PACKAGE_ADDED)
                addAction(Intent.ACTION_PACKAGE_REMOVED)
                addDataScheme("package")
            }
        }
    }
}
