package com.parenthelper.child.services

import android.app.AlarmManager
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.R
import com.parenthelper.child.collectors.AppInstallReceiver
import com.parenthelper.child.collectors.InstalledAppsCollector
import com.parenthelper.child.collectors.LocationCollector
import com.parenthelper.child.collectors.ScreenTimeCollector
import com.parenthelper.child.collectors.WebActivityCollector
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.ActivitySyncRequest
import com.parenthelper.child.enforcement.DomainBlockList
import com.parenthelper.child.enforcement.OverlayPermissionHelper
import com.parenthelper.child.enforcement.RuleManager
import com.parenthelper.child.enforcement.ScreenTimeLimiter
import com.parenthelper.child.enforcement.WebFilterVpnService
import com.parenthelper.child.realtime.SocketManager
import com.parenthelper.child.ui.main.MainActivity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class MonitoringService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var locationCollector: LocationCollector? = null
    private var screenTimeLimiter: ScreenTimeLimiter? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var appInstallReceiver: AppInstallReceiver? = null
    private var overlayPermissionCheckJob: Job? = null
    private var wasOverlayGranted = true

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification())
        acquireWakeLock()
        requestBatteryOptimizationExemption()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        serviceScope.launch {
            val prefs = (application as ParentHelperApp).prefsManager
            val childId = prefs.childId.first() ?: return@launch
            val deviceToken = prefs.deviceToken.first() ?: return@launch

            // Restore persisted remote lock state (survives reboot / process kill)
            restoreEnforcementState(prefs)

            // Start WebSocket connection
            SocketManager.connect(deviceToken)

            // Fetch rules on startup with app suspension support
            RuleManager.init(prefs)
            RuleManager.setAppBlocker(com.parenthelper.child.enforcement.AppBlocker(this@MonitoringService))
            RuleManager.fetchRules(childId)

            // Sync domain block list and start VPN web filter
            val webFilter = RuleManager.currentRules.value?.webFilter
            if (webFilter != null) {
                DomainBlockList.syncFromRules(webFilter)
                startVpnFilter()
            }

            // Re-sync block list when rules change
            serviceScope.launch {
                RuleManager.currentRules.collect { rules ->
                    rules?.webFilter?.let { wf ->
                        DomainBlockList.syncFromRules(wf)
                    }
                }
            }

            // Sync installed apps list to backend
            syncInstalledApps()

            // Start location collection
            locationCollector = LocationCollector(this@MonitoringService)
            locationCollector?.startTracking()

            // Start screen time limiter
            screenTimeLimiter = ScreenTimeLimiter(this@MonitoringService, prefs)
            screenTimeLimiter?.startMonitoring()

            // Register app install receiver dynamically as a backup
            // in case the static manifest receiver is killed by aggressive OEMs
            registerAppInstallReceiver()

            // Register remote command handler
            registerCommandHandler()

            // Monitor overlay permission status
            startOverlayPermissionCheck()

            // Schedule periodic workers
            scheduleHeartbeat()
            scheduleActivitySync()
        }

        return START_STICKY
    }

    private fun registerCommandHandler() {
        SocketManager.setCommandHandler { command ->
            serviceScope.launch {
                Log.d(TAG, "Executing command: ${command.command}")
                when (command.command) {
                    "lock" -> executeLock()
                    "unlock" -> executeUnlock()
                    "locate" -> executeLocate()
                    "sync" -> executeSync()
                }
            }
        }
    }

    private fun executeLock() {
        isDeviceLocked = true
        serviceScope.launch {
            val prefs = (application as ParentHelperApp).prefsManager
            prefs.setRemoteLocked(true)
            prefs.saveOverlayState("REMOTE_LOCK", "Ask your parent to unlock")
        }
        com.parenthelper.child.enforcement.LockScreenOverlay.show(
            this@MonitoringService,
            com.parenthelper.child.enforcement.LockScreenOverlay.Reason.REMOTE_LOCK,
            "Ask your parent to unlock",
        )
    }

    private fun executeUnlock() {
        isDeviceLocked = false
        serviceScope.launch {
            val prefs = (application as ParentHelperApp).prefsManager
            prefs.setRemoteLocked(false)
            prefs.saveOverlayState(null, null)
        }
        com.parenthelper.child.enforcement.LockScreenOverlay.dismiss()
    }

    private suspend fun executeLocate() {
        try {
            val prefs = (application as ParentHelperApp).prefsManager
            val childId = prefs.childId.first() ?: run {
                Log.e(TAG, "Locate: no childId in prefs")
                return
            }
            val deviceId = prefs.deviceId.first() ?: run {
                Log.e(TAG, "Locate: no deviceId in prefs")
                return
            }

            var locations = LocationCollector.getRecentLocations()
            Log.d(TAG, "Locate: ${locations.size} recent location(s) available")

            // If no recent locations, try to get an immediate one
            if (locations.isEmpty()) {
                Log.d(TAG, "Locate: fetching immediate location...")
                val immediate = locationCollector?.getImmediateLocation()
                if (immediate != null) {
                    locations = listOf(immediate)
                    Log.d(TAG, "Locate: got immediate location: ${immediate.lat}, ${immediate.lng}")
                }
            }

            if (locations.isNotEmpty()) {
                val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                ApiClient.service.syncActivity(
                    ActivitySyncRequest(
                        childId = childId,
                        deviceId = deviceId,
                        date = today,
                        apps = null,
                        web = null,
                        location = locations,
                        blockedAttempts = null,
                    )
                )
                Log.d(TAG, "Locate: synced ${locations.size} location(s) to server")
                LocationCollector.clearRecentLocations()
            } else {
                Log.w(TAG, "Locate: no location available (check permissions)")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Locate command failed", e)
        }
    }

    private suspend fun executeSync() {
        try {
            val prefs = (application as ParentHelperApp).prefsManager
            val childId = prefs.childId.first() ?: return
            val deviceId = prefs.deviceId.first() ?: return

            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            val screenTimeCollector = ScreenTimeCollector(this@MonitoringService)
            val appUsage = screenTimeCollector.getTodayAppUsage()
            val locations = LocationCollector.getRecentLocations()
            // Atomically drain web entries to prevent double-counting
            val (webEntries, blockedAttempts) = WebActivityCollector.drainAll()

            ApiClient.service.syncActivity(
                ActivitySyncRequest(
                    childId = childId,
                    deviceId = deviceId,
                    date = today,
                    apps = appUsage,
                    web = if (webEntries.isNotEmpty()) webEntries else null,
                    location = locations,
                    blockedAttempts = if (blockedAttempts.isNotEmpty()) blockedAttempts else null,
                )
            )
            LocationCollector.clearRecentLocations()
        } catch (e: Exception) {
            Log.e(TAG, "Sync command failed", e)
        }
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

    private fun startOverlayPermissionCheck() {
        wasOverlayGranted = OverlayPermissionHelper.hasPermission(this)
        overlayPermissionCheckJob = serviceScope.launch {
            while (isActive) {
                delay(OVERLAY_CHECK_INTERVAL_MS)
                val granted = OverlayPermissionHelper.hasPermission(this@MonitoringService)
                if (!granted && wasOverlayGranted) {
                    Log.w(TAG, "Overlay permission revoked — notifying parent")
                    OverlayPermissionHelper.reportPermissionRevoked()
                    OverlayPermissionHelper.showPermissionLostNotification(this@MonitoringService)
                } else if (granted && !wasOverlayGranted) {
                    Log.d(TAG, "Overlay permission restored")
                    OverlayPermissionHelper.reportPermissionRestored()
                    OverlayPermissionHelper.dismissPermissionLostNotification(this@MonitoringService)
                }
                wasOverlayGranted = granted
            }
        }
    }

    private fun registerAppInstallReceiver() {
        if (appInstallReceiver != null) return
        appInstallReceiver = AppInstallReceiver()
        registerReceiver(appInstallReceiver, AppInstallReceiver.createIntentFilter())
        Log.d(TAG, "Dynamically registered AppInstallReceiver")
    }

    private fun unregisterAppInstallReceiver() {
        appInstallReceiver?.let {
            try {
                unregisterReceiver(it)
                Log.d(TAG, "Unregistered AppInstallReceiver")
            } catch (_: Exception) { }
        }
        appInstallReceiver = null
    }

    private fun syncInstalledApps() {
        serviceScope.launch {
            try {
                val apps = InstalledAppsCollector.getInstalledApps(this@MonitoringService)
                val request = com.parenthelper.child.data.models.InstalledAppsSyncRequest(
                    apps = apps.map { com.parenthelper.child.data.models.InstalledAppEntry(it.packageName, it.appName) }
                )
                ApiClient.service.syncInstalledApps(request)
                Log.d(TAG, "Synced ${apps.size} installed apps")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to sync installed apps: ${e.message}")
            }
        }
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

    /**
     * Restore enforcement state after service restart or device reboot.
     * Re-shows the overlay if it was active before the interruption.
     */
    private suspend fun restoreEnforcementState(prefs: com.parenthelper.child.data.local.PrefsManager) {
        val remoteLocked = prefs.isRemoteLocked.first()
        if (remoteLocked) {
            isDeviceLocked = true
            val detail = prefs.overlayDetail.first() ?: "Ask your parent to unlock"
            com.parenthelper.child.enforcement.LockScreenOverlay.show(
                this@MonitoringService,
                com.parenthelper.child.enforcement.LockScreenOverlay.Reason.REMOTE_LOCK,
                detail,
            )
            Log.d(TAG, "Restored remote lock overlay after restart")
            return
        }

        // For non-remote-lock overlays (daily limit, schedule, etc.),
        // the ScreenTimeLimiter will re-evaluate within 30s and re-show if needed.
        // But check immediately to minimize the gap.
        val savedReason = prefs.overlayReason.first()
        if (savedReason != null && savedReason != "REMOTE_LOCK") {
            Log.d(TAG, "Overlay was active ($savedReason) before restart — ScreenTimeLimiter will re-check shortly")
        }
    }

    /**
     * Request battery optimization exemption so the service survives Doze mode.
     * This prompts the user once; subsequent calls are no-ops if already exempt.
     */
    private fun requestBatteryOptimizationExemption() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
                Log.d(TAG, "Requested battery optimization exemption")
            } catch (e: Exception) {
                Log.w(TAG, "Could not request battery optimization exemption", e)
            }
        }
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

    private fun acquireWakeLock() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "PrimeKids::MonitoringWakeLock"
        ).apply {
            acquire()
        }
        Log.d(TAG, "WakeLock acquired")
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
                Log.d(TAG, "WakeLock released")
            }
        }
        wakeLock = null
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "Task removed — scheduling service restart")
        scheduleRestart()
        super.onTaskRemoved(rootIntent)
    }

    private fun scheduleRestart() {
        val restartIntent = Intent(this, MonitoringService::class.java).apply {
            setPackage(packageName)
        }
        val pendingIntent = PendingIntent.getService(
            this, RESTART_REQUEST_CODE, restartIntent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE,
        )
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 3000,
            pendingIntent,
        )
    }

    override fun onDestroy() {
        Log.d(TAG, "Service destroyed — scheduling restart")
        // Persist current overlay state so it can be restored after restart
        val overlay = com.parenthelper.child.enforcement.LockScreenOverlay
        if (overlay.isShowing) {
            val prefs = (application as ParentHelperApp).prefsManager
            val reason = overlay.currentReasonName
            kotlinx.coroutines.runBlocking {
                prefs.saveOverlayState(reason, null)
            }
        }
        scheduleRestart()
        releaseWakeLock()
        unregisterAppInstallReceiver()
        overlayPermissionCheckJob?.cancel()
        serviceScope.cancel()
        locationCollector?.stopTracking()
        screenTimeLimiter?.stopMonitoring()
        SocketManager.disconnect()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "MonitoringService"
        const val NOTIFICATION_ID = 1001
        private const val RESTART_REQUEST_CODE = 9999
        private const val OVERLAY_CHECK_INTERVAL_MS = 60_000L // Check every 60 seconds
        @Volatile
        var isDeviceLocked = false
    }
}
