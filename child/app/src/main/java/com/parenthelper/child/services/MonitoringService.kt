package com.parenthelper.child.services

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.R
import com.parenthelper.child.collectors.LocationCollector
import com.parenthelper.child.enforcement.DomainBlockList
import com.parenthelper.child.enforcement.RuleManager
import com.parenthelper.child.enforcement.ScreenTimeLimiter
import com.parenthelper.child.enforcement.WebFilterVpnService
import com.parenthelper.child.realtime.SocketManager
import com.parenthelper.child.ui.main.MainActivity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

class MonitoringService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var locationCollector: LocationCollector? = null
    private var screenTimeLimiter: ScreenTimeLimiter? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        serviceScope.launch {
            val prefs = (application as ParentHelperApp).prefsManager
            val childId = prefs.childId.first() ?: return@launch
            val deviceToken = prefs.deviceToken.first() ?: return@launch

            // Start WebSocket connection
            SocketManager.connect(deviceToken)

            // Fetch rules on startup
            RuleManager.init(prefs)
            RuleManager.fetchRules(childId)

            // Sync domain block list and start VPN web filter
            val webFilter = RuleManager.currentRules.value?.webFilter
            if (webFilter != null && webFilter.categories.isNotEmpty()) {
                DomainBlockList.syncFromServer(webFilter.categories)
                DomainBlockList.addDomains(webFilter.customBlock)
                startVpnFilter()
            }

            // Start location collection
            locationCollector = LocationCollector(this@MonitoringService)
            locationCollector?.startTracking()

            // Start screen time limiter
            screenTimeLimiter = ScreenTimeLimiter(this@MonitoringService, prefs)
            screenTimeLimiter?.startMonitoring()

            // Schedule periodic workers
            scheduleHeartbeat()
            scheduleActivitySync()
        }

        return START_STICKY
    }

    private fun scheduleHeartbeat() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val heartbeatWork = PeriodicWorkRequestBuilder<HeartbeatWorker>(
            15, TimeUnit.MINUTES,
        ).setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "heartbeat",
            ExistingPeriodicWorkPolicy.KEEP,
            heartbeatWork,
        )
    }

    private fun scheduleActivitySync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWork = PeriodicWorkRequestBuilder<ActivitySyncWorker>(
            15, TimeUnit.MINUTES,
        ).setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "activity_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncWork,
        )
    }

    private fun startVpnFilter() {
        // VPN requires user consent via VpnService.prepare(), which is handled in MainActivity
        // If VPN is already prepared, start the service directly
        val vpnIntent = android.net.VpnService.prepare(this)
        if (vpnIntent == null) {
            // VPN permission already granted
            val intent = Intent(this, WebFilterVpnService::class.java)
            startService(intent)
        }
        // If vpnIntent is not null, the UI must prompt the user — handled in MainActivity
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, ParentHelperApp.CHANNEL_MONITORING)
            .setContentTitle(getString(R.string.monitoring_notification_title))
            .setContentText(getString(R.string.monitoring_notification_text))
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        locationCollector?.stopTracking()
        screenTimeLimiter?.stopMonitoring()
        SocketManager.disconnect()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val NOTIFICATION_ID = 1001
    }
}
