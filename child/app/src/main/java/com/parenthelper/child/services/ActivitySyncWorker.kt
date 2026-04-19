package com.parenthelper.child.services

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.collectors.LocationCollector
import com.parenthelper.child.collectors.ScreenTimeCollector
import com.parenthelper.child.collectors.WebActivityCollector
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.ActivitySyncRequest
import com.parenthelper.child.data.models.BlockedAttempt
import com.parenthelper.child.enforcement.BlockedAttemptLogger
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
            if (!prefs.isPaired.first()) return Result.success()

            val childId = prefs.childId.first() ?: return Result.failure()
            val deviceId = prefs.deviceId.first() ?: return Result.failure()

            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

            // Collect screen time data
            val screenTimeCollector = ScreenTimeCollector(applicationContext)
            val appUsage = screenTimeCollector.getTodayAppUsage()

            // Collect location data
            val locations = LocationCollector.getRecentLocations()

            // Atomically drain web entries and blocked attempts from WebActivityCollector
            val (webEntries, webBlockedAttempts) = WebActivityCollector.drainAll()

            // Also drain VPN-level blocked attempts from BlockedAttemptLogger
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            dateFormat.timeZone = TimeZone.getTimeZone("UTC")
            val rawAttempts = BlockedAttemptLogger.drainAttempts()
            val loggerBlockedAttempts = rawAttempts.map { attempt ->
                BlockedAttempt(
                    type = "web_filter",
                    target = attempt.domain,
                    timestamp = dateFormat.format(Date(attempt.timestamp)),
                )
            }

            // Combine blocked attempts from both sources, deduplicated by target+type
            val allBlockedAttempts = (webBlockedAttempts + loggerBlockedAttempts)
                .distinctBy { "${it.type}:${it.target}" }
                .ifEmpty { null }

            val request = ActivitySyncRequest(
                childId = childId,
                deviceId = deviceId,
                date = today,
                apps = appUsage,
                web = if (webEntries.isNotEmpty()) webEntries else null,
                location = locations,
                blockedAttempts = allBlockedAttempts,
            )

            val response = ApiClient.service.syncActivity(request)
            LocationCollector.clearRecentLocations()

            // Persist geofence inside/outside states from backend for state continuity
            response.geofenceStates?.let { states ->
                prefs.saveGeofenceStates(states)
            }

            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}
