package com.parenthelper.child.ui.main

import android.Manifest
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.net.VpnService
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.R
import com.parenthelper.child.collectors.LocationCollector
import com.parenthelper.child.collectors.ScreenTimeCollector
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.SosRequest
import com.parenthelper.child.enforcement.OverlayPermissionHelper
import com.parenthelper.child.enforcement.ParentHelperDeviceAdmin
import com.parenthelper.child.enforcement.WebFilterVpnService
import com.parenthelper.child.services.MonitoringService
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var tvScreenTime: TextView
    private lateinit var tvDailyLimit: TextView
    private lateinit var tvMonitoringStatus: TextView
    private lateinit var tvSosStatus: TextView
    private lateinit var tvSosHint: TextView
    private lateinit var btnRequestPermissions: MaterialButton
    private lateinit var btnSos: FrameLayout
    private lateinit var sosPulseRing: View

    private var sosHoldJob: Job? = null
    private var isSosSending = false
    private var pulseAnimator: AnimatorSet? = null

    private val locationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        checkPermissionsAndStart()
    }

    private val vpnConsentRequest = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            startService(Intent(this, WebFilterVpnService::class.java))
        }
    }

    private val overlayPermissionRequest = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { _ ->
        if (OverlayPermissionHelper.hasPermission(this)) {
            OverlayPermissionHelper.reportPermissionRestored()
        }
        checkPermissionsAndStart()
    }

    private val deviceAdminRequest = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { _ ->
        checkPermissionsAndStart()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvScreenTime = findViewById(R.id.tvScreenTime)
        tvDailyLimit = findViewById(R.id.tvDailyLimit)
        tvMonitoringStatus = findViewById(R.id.tvMonitoringStatus)
        tvSosStatus = findViewById(R.id.tvSosStatus)
        tvSosHint = findViewById(R.id.tvSosHint)
        btnRequestPermissions = findViewById(R.id.btnRequestPermissions)
        btnSos = findViewById(R.id.btnSos)
        sosPulseRing = findViewById(R.id.sosPulseRing)

        btnRequestPermissions.setOnClickListener { requestAllPermissions() }
        setupSosButton()

        checkPermissionsAndStart()
    }

    override fun onResume() {
        super.onResume()
        checkPermissionsAndStart()
        updateScreenTimeDisplay()
        // If overlay permission was just re-granted, dismiss the warning notification
        if (OverlayPermissionHelper.hasPermission(this)) {
            OverlayPermissionHelper.dismissPermissionLostNotification(this)
        }
    }

    override fun onDestroy() {
        pulseAnimator?.cancel()
        super.onDestroy()
    }

    // ── SOS Button ──────────────────────────────────────────────────────

    private fun setupSosButton() {
        btnSos.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    if (!isSosSending) {
                        v.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                        startSosHoldCountdown()
                        animateSosPress(true)
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    cancelSosHold()
                    animateSosPress(false)
                    true
                }
                else -> false
            }
        }
    }

    private fun startSosHoldCountdown() {
        sosHoldJob?.cancel()
        tvSosHint.text = getString(R.string.sos_hold_countdown)
        startPulseAnimation()

        sosHoldJob = lifecycleScope.launch {
            delay(SOS_HOLD_DURATION_MS)
            // Hold completed — trigger SOS
            btnSos.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
            sendSos()
        }
    }

    private fun cancelSosHold() {
        sosHoldJob?.cancel()
        sosHoldJob = null
        if (!isSosSending) {
            tvSosHint.text = getString(R.string.sos_hold_hint)
            tvSosStatus.text = getString(R.string.sos_description)
        }
        stopPulseAnimation()
    }

    private fun sendSos() {
        if (isSosSending) return
        isSosSending = true

        tvSosHint.text = getString(R.string.sos_sending)
        tvSosStatus.text = getString(R.string.sos_sending)

        lifecycleScope.launch {
            try {
                // Try to include current location
                var lat: Double? = null
                var lng: Double? = null
                val locations = LocationCollector.getRecentLocations()
                if (locations.isNotEmpty()) {
                    lat = locations.last().lat
                    lng = locations.last().lng
                }

                ApiClient.service.sendSos(SosRequest(lat = lat, lng = lng))

                tvSosHint.text = getString(R.string.sos_hold_hint)
                tvSosStatus.text = getString(R.string.sos_sent)
                tvSosStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.status_active))
                Log.d(TAG, "SOS alert sent successfully")

                // Reset status text after a few seconds
                delay(5000)
                tvSosStatus.text = getString(R.string.sos_description)
                tvSosStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.text_secondary))
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send SOS", e)
                tvSosHint.text = getString(R.string.sos_hold_hint)
                tvSosStatus.text = getString(R.string.sos_failed)
                tvSosStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.status_error))

                delay(3000)
                tvSosStatus.text = getString(R.string.sos_description)
                tvSosStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.text_secondary))
            } finally {
                isSosSending = false
                stopPulseAnimation()
            }
        }
    }

    private fun animateSosPress(pressed: Boolean) {
        val scale = if (pressed) 0.92f else 1.0f
        btnSos.animate()
            .scaleX(scale)
            .scaleY(scale)
            .setDuration(150)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .start()
    }

    private fun startPulseAnimation() {
        pulseAnimator?.cancel()

        val scaleX = ObjectAnimator.ofFloat(sosPulseRing, View.SCALE_X, 1f, 1.15f, 1f)
        val scaleY = ObjectAnimator.ofFloat(sosPulseRing, View.SCALE_Y, 1f, 1.15f, 1f)
        val alpha = ObjectAnimator.ofFloat(sosPulseRing, View.ALPHA, 1f, 0.4f, 1f)

        pulseAnimator = AnimatorSet().apply {
            playTogether(scaleX, scaleY, alpha)
            duration = 1000
            interpolator = AccelerateDecelerateInterpolator()
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: android.animation.Animator) {
                    if (sosHoldJob?.isActive == true || isSosSending) {
                        start()
                    }
                }
            })
            start()
        }
    }

    private fun stopPulseAnimation() {
        pulseAnimator?.cancel()
        sosPulseRing.scaleX = 1f
        sosPulseRing.scaleY = 1f
        sosPulseRing.alpha = 1f
    }

    // ── Permissions & Monitoring ────────────────────────────────────────

    private fun checkPermissionsAndStart() {
        val missingPermissions = getMissingPermissions()
        val hasOverlay = OverlayPermissionHelper.hasPermission(this)

        if (missingPermissions.isEmpty() && hasUsageStatsPermission() && hasOverlay) {
            btnRequestPermissions.visibility = View.GONE
            tvMonitoringStatus.text = getString(R.string.status_monitoring)
            startMonitoringService()
        } else {
            btnRequestPermissions.visibility = View.VISIBLE
            tvMonitoringStatus.text = getString(R.string.status_permissions_needed)
            tvMonitoringStatus.setTextColor(ContextCompat.getColor(this, R.color.status_warning))
            tvMonitoringStatus.setBackgroundResource(0) // remove chip background
        }
    }

    private fun getMissingPermissions(): List<String> {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        return permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
    }

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = getSystemService(AppOpsManager::class.java)
        val mode = appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            packageName,
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun requestAllPermissions() {
        // Overlay permission requires its own system settings page
        if (!OverlayPermissionHelper.hasPermission(this)) {
            overlayPermissionRequest.launch(OverlayPermissionHelper.createRequestIntent(this))
            return
        }

        if (!hasUsageStatsPermission()) {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
            return
        }

        val missing = getMissingPermissions()
        if (missing.isNotEmpty()) {
            locationPermissionRequest.launch(missing.toTypedArray())
        }
    }

    private fun startMonitoringService() {
        val intent = Intent(this, MonitoringService::class.java)
        ContextCompat.startForegroundService(this, intent)
        requestBatteryOptimizationExemption()
        requestDeviceAdmin()
        requestVpnConsent()
    }

    private fun requestBatteryOptimizationExemption() {
        val pm = getSystemService(PowerManager::class.java)
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:$packageName")
            }
            startActivity(intent)
        }
    }

    private fun requestDeviceAdmin() {
        val dpm = getSystemService(DevicePolicyManager::class.java)
        val adminComponent = ParentHelperDeviceAdmin.getComponentName(this)
        if (!dpm.isAdminActive(adminComponent)) {
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                putExtra(
                    DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "Enable device admin to prevent unauthorized app removal."
                )
            }
            deviceAdminRequest.launch(intent)
        }
    }

    private fun requestVpnConsent() {
        val vpnIntent = VpnService.prepare(this)
        if (vpnIntent != null) {
            vpnConsentRequest.launch(vpnIntent)
        } else {
            startService(Intent(this, WebFilterVpnService::class.java))
        }
    }

    private fun updateScreenTimeDisplay() {
        lifecycleScope.launch {
            val screenTimeMin = ScreenTimeCollector(this@MainActivity).getTodayScreenTimeMin()
            val hours = screenTimeMin / 60
            val mins = screenTimeMin % 60
            tvScreenTime.text = if (hours > 0) "${hours}ц ${mins}мин" else "${mins} мин"

            val rules = (application as ParentHelperApp).prefsManager.cachedRules.first()
            val limitMin = rules?.screenTime?.dailyLimitMin
            if (limitMin != null) {
                val lh = limitMin / 60
                val lm = limitMin % 60
                val limitStr = if (lh > 0) "${lh}ц ${lm}мин" else "${lm} мин"
                tvDailyLimit.text = "Өдрийн хязгаар: $limitStr"
            } else {
                tvDailyLimit.text = getString(R.string.daily_limit_no_limit)
            }
        }
    }

    companion object {
        private const val TAG = "MainActivity"
        private const val SOS_HOLD_DURATION_MS = 1500L // Hold for 1.5 seconds to trigger
    }
}
