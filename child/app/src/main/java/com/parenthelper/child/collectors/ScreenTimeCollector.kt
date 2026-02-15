package com.parenthelper.child.collectors

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import com.parenthelper.child.data.models.AppUsageEntry
import java.util.*

class ScreenTimeCollector(private val context: Context) {

    private val usageStatsManager = context.getSystemService(UsageStatsManager::class.java)

    fun getTodayScreenTimeMin(): Int {
        val usageList = getTodayAppUsage()
        return usageList.sumOf { it.durationMin }
    }

    fun getTodayAppUsage(): List<AppUsageEntry> {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val startTime = calendar.timeInMillis
        val endTime = System.currentTimeMillis()

        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime,
        )

        if (stats.isNullOrEmpty()) return emptyList()

        val pm = context.packageManager

        return stats
            .filter { it.totalTimeInForeground > 60_000 } // At least 1 minute
            .map { stat ->
                val appName = try {
                    val appInfo = pm.getApplicationInfo(stat.packageName, 0)
                    pm.getApplicationLabel(appInfo).toString()
                } catch (_: PackageManager.NameNotFoundException) {
                    stat.packageName
                }

                AppUsageEntry(
                    packageName = stat.packageName,
                    appName = appName,
                    durationMin = (stat.totalTimeInForeground / 60_000).toInt(),
                )
            }
            .sortedByDescending { it.durationMin }
    }
}
