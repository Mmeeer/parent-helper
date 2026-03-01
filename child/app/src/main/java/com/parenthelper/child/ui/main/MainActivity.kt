package com.parenthelper.child.ui.main

import android.Manifest
import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.VpnService
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.R
import com.parenthelper.child.collectors.ScreenTimeCollector
import com.parenthelper.child.enforcement.ParentHelperDeviceAdmin
import com.parenthelper.child.enforcement.WebFilterVpnService
import com.parenthelper.child.services.MonitoringService
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var tvScreenTime: TextView
    private lateinit var tvDailyLimit: TextView
    private lateinit var tvMonitoringStatus: TextView
    private lateinit var btnRequestPermissions: MaterialButton

    private val locationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        checkPermissionsAndStart()
    }

    private val vpnConsentRequest = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            startService(Intent(this, WebFilterVpnService::class.java))
        }
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
        btnRequestPermissions = findViewById(R.id.btnRequestPermissions)

        btnRequestPermissions.setOnClickListener { requestAllPermissions() }

        checkPermissionsAndStart()
    }

    override fun onResume() {
        super.onResume()
        checkPermissionsAndStart()
        updateScreenTimeDisplay()
    }

    private fun checkPermissionsAndStart() {
        val missingPermissions = getMissingPermissions()

        if (missingPermissions.isEmpty() && hasUsageStatsPermission()) {
            btnRequestPermissions.visibility = View.GONE
            tvMonitoringStatus.text = getString(R.string.status_monitoring)
            startMonitoringService()
        } else {
            btnRequestPermissions.visibility = View.VISIBLE
            tvMonitoringStatus.text = "Permissions needed"
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

        // Request device admin if not already active
        requestDeviceAdmin()

        // Request VPN consent if not already granted
        requestVpnConsent()
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
            // VPN already prepared, start the filter service
            startService(Intent(this, WebFilterVpnService::class.java))
        }
    }

    private fun updateScreenTimeDisplay() {
        lifecycleScope.launch {
            val screenTimeMin = ScreenTimeCollector(this@MainActivity).getTodayScreenTimeMin()
            tvScreenTime.text = "Screen time today: $screenTimeMin min"

            val rules = (application as ParentHelperApp).prefsManager.cachedRules.first()
            val limitMin = rules?.screenTime?.dailyLimitMin
            tvDailyLimit.text = if (limitMin != null) "Daily limit: $limitMin min" else "Daily limit: --"
        }
    }
}
