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
            LockScreenOverlay.show(context, LockScreenOverlay.Reason.DAILY_LIMIT, remainingMsg)
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
                    LockScreenOverlay.show(context, LockScreenOverlay.Reason.APP_LIMIT, "Limit for $appName reached")
                    appBlocker.checkAndBlockIfNeeded()
                    return
                }
            }
        }

        // All clear — dismiss overlay if it was showing for a limit reason
        dismissOverlayIfNotRemoteLocked()
    }

    private fun checkSchedule(): Boolean {
        val rules = RuleManager.currentRules.value ?: return false
        val schedules = rules.screenTime?.schedule ?: return false

        val now = java.util.Calendar.getInstance()
        val dayOfWeek = now.get(java.util.Calendar.DAY_OF_WEEK) // 1=Sunday
        val day = dayOfWeek - 1

        val currentTime = String.format(
            "%02d:%02d",
            now.get(java.util.Calendar.HOUR_OF_DAY),
            now.get(java.util.Calendar.MINUTE),
        )

        for (schedule in schedules) {
            if (day in schedule.days &&
                schedule.blocked &&
                currentTime >= schedule.startTime &&
                currentTime <= schedule.endTime
            ) {
                val detail = "Unlocks at ${schedule.endTime}"
                LockScreenOverlay.show(context, LockScreenOverlay.Reason.SCHEDULE_BLOCKED, detail)
                appBlocker.checkAndBlockIfNeeded()
                return true
            }
        }

        return false
    }

    private fun dismissOverlayIfNotRemoteLocked() {
        // Only dismiss if not remotely locked by parent
        if (!com.parenthelper.child.services.MonitoringService.isDeviceLocked &&
            LockScreenOverlay.isShowing
        ) {
            LockScreenOverlay.dismiss()
        }
    }

    companion object {
        private const val CHECK_INTERVAL_MS = 30_000L // Check every 30 seconds
    }
}
