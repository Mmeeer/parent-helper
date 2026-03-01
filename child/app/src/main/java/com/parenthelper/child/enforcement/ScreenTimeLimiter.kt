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
        // Check daily limit
        val dailyLimit = RuleManager.getDailyLimitMin() ?: return
        val totalScreenTime = screenTimeCollector.getTodayScreenTimeMin()

        if (totalScreenTime >= dailyLimit) {
            // Daily limit exceeded — block usage
            appBlocker.checkAndBlockIfNeeded()
            return
        }

        // Check per-app limits
        val foregroundPackage = appBlocker.getCurrentForegroundPackage() ?: return
        val appLimit = RuleManager.getAppLimitMin(foregroundPackage) ?: return
        val appUsage = screenTimeCollector.getTodayAppUsage()
        val appTime = appUsage.find { it.packageName == foregroundPackage }?.durationMin ?: 0

        if (appTime >= appLimit) {
            appBlocker.checkAndBlockIfNeeded()
        }

        // Check schedule-based blocking
        checkSchedule()
    }

    private fun checkSchedule() {
        val rules = RuleManager.currentRules.value ?: return
        val schedules = rules.screenTime?.schedule ?: return

        val now = java.util.Calendar.getInstance()
        val dayOfWeek = now.get(java.util.Calendar.DAY_OF_WEEK) // 1=Sunday
        // Convert to our format: 0=Sunday, 1=Monday, etc.
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
                appBlocker.checkAndBlockIfNeeded()
                return
            }
        }
    }

    companion object {
        private const val CHECK_INTERVAL_MS = 30_000L // Check every 30 seconds
    }
}
