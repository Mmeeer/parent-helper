package com.parenthelper.child.collectors

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.util.Log

data class InstalledAppInfo(
    val packageName: String,
    val appName: String,
)

/**
 * Collects the list of user-installed apps (excludes system apps).
 */
object InstalledAppsCollector {

    private const val TAG = "InstalledAppsCollector"

    fun getInstalledApps(context: Context): List<InstalledAppInfo> {
        val pm = context.packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)

        return apps
            .filter { app ->
                // Only user-installed apps (not system)
                (app.flags and ApplicationInfo.FLAG_SYSTEM) == 0 &&
                    app.packageName != context.packageName
            }
            .map { app ->
                InstalledAppInfo(
                    packageName = app.packageName,
                    appName = pm.getApplicationLabel(app).toString(),
                )
            }
            .sortedBy { it.appName.lowercase() }
    }
}
