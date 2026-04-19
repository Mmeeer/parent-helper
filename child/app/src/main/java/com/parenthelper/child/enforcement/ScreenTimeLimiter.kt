package com.parenthelper.child.enforcement

import android.content.Context
import com.parenthelper.child.collectors.ScreenTimeCollector
import com.parenthelper.child.data.local.PrefsManager
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first

class ScreenTimeLimiter(
    private val context: Context,
    private val prefs: PrefsManager,
) {
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val screenTimeCollector = ScreenTimeCollector(context)
    private val appBlocker = AppBlocker(context)
    private var monitoringJob: Job? = null

    fun startMonitoring() {
        monitoringJob = scope.launch {
            while (isActive) {
                checkLimits()
                delay(CHECK_INTERVAL_MS)
            }
        }
    }

    fun stopMonitoring() {
        monitoringJob?.cancel()
        scope.cancel()
    }

    private suspend fun checkLimits() {
        // Check schedule-based blocking first (highest priority)
        if (checkSchedule()) return

        // Check daily limit
        val dailyLimit = RuleManager.getDailyLimitMin() ?: run {
            // No limit set — make sure overlay is dismissed
            dismissOverlayIfNotRemoteLocked()
            return
        }
        val totalScreenTime = screenTimeCollector.getTodayScreenTimeMin()

        if (totalScreenTime >= dailyLimit) {
            val remainingMsg = "Resets at midnight"
            showAndPersistOverlay(LockScreenOverlay.Reason.DAILY_LIMIT, remainingMsg)
            appBlocker.checkAndBlockIfNeeded()
            return
        }

        // Check per-app limits
        val foregroundPackage = appBlocker.getCurrentForegroundPackage()
        if (foregroundPackage != null) {
            val appLimit = RuleManager.getAppLimitMin(foregroundPackage)
            if (appLimit != null) {
                val appUsage = screenTimeCollector.getTodayAppUsage()
                val appTime = appUsage.find { it.packageName == foregroundPackage }?.durationMin ?: 0

                if (appTime >= appLimit) {
                    val appName = appUsage.find { it.packageName == foregroundPackage }?.appName ?: foregroundPackage
                    showAndPersistOverlay(LockScreenOverlay.Reason.APP_LIMIT, "Limit for $appName reached")
                    appBlocker.checkAndBlockIfNeeded()
                    return
                }
            }
        }

        // All clear — dismiss overlay if it was showing for a limit reason
        dismissOverlayIfNotRemoteLocked()
    }

    private suspend fun showAndPersistOverlay(reason: LockScreenOverlay.Reason, detail: String?) {
        LockScreenOverlay.ensureShowing(context, reason, detail)
        prefs.saveOverlayState(reason.name, detail)
    }

    /**
     * Checks schedule-based blocking using ScheduleEnforcer.
     * Returns true if device is currently blocked by schedule.
     */
    private suspend fun checkSchedule(): Boolean {
        if (!ScheduleEnforcer.isCurrentlyBlocked()) return false

        val unlockTime = ScheduleEnforcer.getNextUnblockTime()
        val detail = if (unlockTime != null) "Unlocks at $unlockTime" else null
        showAndPersistOverlay(LockScreenOverlay.Reason.SCHEDULE_BLOCKED, detail)
        appBlocker.checkAndBlockIfNeeded()
        return true
    }

    private suspend fun dismissOverlayIfNotRemoteLocked() {
        // Only dismiss if not remotely locked by parent
        if (!com.parenthelper.child.services.MonitoringService.isDeviceLocked &&
            LockScreenOverlay.isShowing
        ) {
            LockScreenOverlay.dismiss()
            prefs.saveOverlayState(null, null)
        }
    }

    companion object {
        private const val CHECK_INTERVAL_MS = 30_000L // Check every 30 seconds
    }
}
