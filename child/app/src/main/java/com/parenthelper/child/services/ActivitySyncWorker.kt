package com.parenthelper.child.services

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.collectors.LocationCollector
import com.parenthelper.child.collectors.ScreenTimeCollector
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.ActivitySyncRequest
import kotlinx.coroutines.flow.first
import java.text.SimpleDateFormat
import java.util.*

class ActivitySyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val prefs = (applicationContext as ParentHelperApp).prefsManager
            val childId = prefs.childId.first() ?: return Result.failure()
            val deviceId = prefs.deviceId.first() ?: return Result.failure()

            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

            // Collect screen time data
            val screenTimeCollector = ScreenTimeCollector(applicationContext)
            val appUsage = screenTimeCollector.getTodayAppUsage()

            // Collect location data
            val locations = LocationCollector.getRecentLocations()

            val request = ActivitySyncRequest(
                childId = childId,
                deviceId = deviceId,
                date = today,
                apps = appUsage,
                web = null,
                location = locations,
                blockedAttempts = null,
            )

            ApiClient.service.syncActivity(request)
            LocationCollector.clearRecentLocations()

            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}
