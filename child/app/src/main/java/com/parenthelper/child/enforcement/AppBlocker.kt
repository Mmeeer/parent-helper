package com.parenthelper.child.enforcement

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent

/**
 * Monitors the foreground app and triggers an overlay when a blocked app is detected.
 * Uses UsageStatsManager to detect the current foreground app.
 */
class AppBlocker(private val context: Context) {

    private val usageStatsManager = context.getSystemService(UsageStatsManager::class.java)

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

    private fun bringToFront() {
        // Launch our main activity to cover the blocked app
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        context.startActivity(intent)
    }
}
