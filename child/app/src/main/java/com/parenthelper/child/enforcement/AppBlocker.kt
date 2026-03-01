package com.parenthelper.child.enforcement

import android.app.admin.DevicePolicyManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Monitors the foreground app and blocks it using system-level suspension
 * via DevicePolicyManager when available, falling back to UI overlay.
 */
class AppBlocker(private val context: Context) {

    private val usageStatsManager = context.getSystemService(UsageStatsManager::class.java)
    private val devicePolicyManager = context.getSystemService(DevicePolicyManager::class.java)
    private val adminComponent = ParentHelperDeviceAdmin.getComponentName(context)

    fun getCurrentForegroundPackage(): String? {
        val endTime = System.currentTimeMillis()
        val startTime = endTime - 5000 // Last 5 seconds

        val events = usageStatsManager.queryEvents(startTime, endTime)
        val event = UsageEvents.Event()
        var lastResumedPackage: String? = null

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                lastResumedPackage = event.packageName
            }
        }

        return lastResumedPackage
    }

    fun checkAndBlockIfNeeded(): Boolean {
        val foregroundPackage = getCurrentForegroundPackage() ?: return false

        // Don't block our own app or system apps
        if (foregroundPackage == context.packageName) return false
        if (foregroundPackage.startsWith("com.android.")) return false

        if (RuleManager.isAppBlocked(foregroundPackage)) {
            bringToFront()
            return true
        }

        return false
    }

    /**
     * Suspend blocked apps at the system level using DevicePolicyManager.
     * This prevents them from being launched entirely (greyed out in launcher).
     */
    fun syncSuspendedApps(blockedApps: List<String>) {
        if (!isDeviceAdminActive()) return

        try {
            val packagesToSuspend = blockedApps.filter { pkg ->
                pkg != context.packageName && !pkg.startsWith("com.android.")
            }.toTypedArray()

            if (packagesToSuspend.isNotEmpty()) {
                devicePolicyManager.setPackagesSuspended(
                    adminComponent,
                    packagesToSuspend,
                    true, // suspended
                )
                Log.d(TAG, "Suspended ${packagesToSuspend.size} apps")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to suspend apps via DPM", e)
        }
    }

    /**
     * Unsuspend apps that are no longer on the blocked list.
     */
    fun unsuspendApps(appsToUnsuspend: List<String>) {
        if (!isDeviceAdminActive()) return

        try {
            val packages = appsToUnsuspend.toTypedArray()
            if (packages.isNotEmpty()) {
                devicePolicyManager.setPackagesSuspended(
                    adminComponent,
                    packages,
                    false, // unsuspended
                )
                Log.d(TAG, "Unsuspended ${packages.size} apps")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to unsuspend apps via DPM", e)
        }
    }

    private fun isDeviceAdminActive(): Boolean {
        return devicePolicyManager.isAdminActive(adminComponent)
    }

    private fun bringToFront() {
        // Launch our main activity to cover the blocked app (fallback for non-admin)
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        context.startActivity(intent)
    }

    companion object {
        private const val TAG = "AppBlocker"
    }
}
