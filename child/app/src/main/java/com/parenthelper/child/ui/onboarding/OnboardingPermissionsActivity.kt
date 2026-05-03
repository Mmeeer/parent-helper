package com.parenthelper.child.ui.onboarding

import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.parenthelper.child.R
import com.parenthelper.child.enforcement.OverlayPermissionHelper
import com.parenthelper.child.enforcement.ParentHelperDeviceAdmin
import com.parenthelper.child.services.ParentHelperAccessibilityService

class OnboardingPermissionsActivity : AppCompatActivity() {

    private lateinit var tvStepIndicator: TextView
    private lateinit var llStepDots: LinearLayout
    private lateinit var ivPermissionIcon: ImageView
    private lateinit var tvPermissionTitle: TextView
    private lateinit var tvPermissionWhy: TextView
    private lateinit var tvPermissionStatus: TextView
    private lateinit var btnGrant: MaterialButton
    private lateinit var btnSkip: MaterialButton

    private var currentStep = 0

    data class PermissionStep(
        val iconRes: Int,
        val titleRes: Int,
        val whyRes: Int,
        val checkGranted: () -> Boolean,
        val requestPermission: () -> Unit,
        val required: Boolean = false,
    )

    private lateinit var steps: List<PermissionStep>

    // Activity result launchers
    private val usageStatsLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { _ -> refreshCurrentStep() }

    private val deviceAdminLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { _ -> refreshCurrentStep() }

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ -> refreshCurrentStep() }

    private val batteryOptLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { _ -> refreshCurrentStep() }

    private val accessibilityLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { _ -> refreshCurrentStep() }

    private val overlayLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { _ ->
        if (OverlayPermissionHelper.hasPermission(this)) {
            OverlayPermissionHelper.reportPermissionRestored()
        }
        refreshCurrentStep()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_onboarding_permissions)

        tvStepIndicator = findViewById(R.id.tvStepIndicator)
        llStepDots = findViewById(R.id.llStepDots)
        ivPermissionIcon = findViewById(R.id.ivPermissionIcon)
        tvPermissionTitle = findViewById(R.id.tvPermissionTitle)
        tvPermissionWhy = findViewById(R.id.tvPermissionWhy)
        tvPermissionStatus = findViewById(R.id.tvPermissionStatus)
        btnGrant = findViewById(R.id.btnGrant)
        btnSkip = findViewById(R.id.btnSkip)

        steps = listOf(
            // 1. Usage Stats
            PermissionStep(
                iconRes = R.drawable.ic_usage_stats,
                titleRes = R.string.perm_usage_stats_title,
                whyRes = R.string.perm_usage_stats_why,
                checkGranted = { hasUsageStatsPermission() },
                requestPermission = {
                    usageStatsLauncher.launch(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                },
            ),
            // 2. Device Admin
            PermissionStep(
                iconRes = R.drawable.ic_admin_panel,
                titleRes = R.string.perm_device_admin_title,
                whyRes = R.string.perm_device_admin_why,
                checkGranted = { isDeviceAdminActive() },
                requestPermission = {
                    val adminComponent = ParentHelperDeviceAdmin.getComponentName(this)
                    val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                        putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                        putExtra(
                            DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                            getString(R.string.perm_device_admin_why),
                        )
                    }
                    deviceAdminLauncher.launch(intent)
                },
            ),
            // 3. Location
            PermissionStep(
                iconRes = R.drawable.ic_location,
                titleRes = R.string.perm_location_title,
                whyRes = R.string.perm_location_why,
                checkGranted = { hasLocationPermission() },
                requestPermission = {
                    val permissions = mutableListOf(
                        android.Manifest.permission.ACCESS_FINE_LOCATION,
                        android.Manifest.permission.ACCESS_COARSE_LOCATION,
                    )
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        permissions.add(android.Manifest.permission.POST_NOTIFICATIONS)
                    }
                    locationPermissionLauncher.launch(permissions.toTypedArray())
                },
            ),
            // 4. Battery Optimization
            PermissionStep(
                iconRes = R.drawable.ic_battery,
                titleRes = R.string.perm_battery_title,
                whyRes = R.string.perm_battery_why,
                checkGranted = { isBatteryOptimizationExempt() },
                requestPermission = {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    batteryOptLauncher.launch(intent)
                },
            ),
            // 5. Accessibility — required for app blocking to function at all
            PermissionStep(
                iconRes = R.drawable.ic_accessibility,
                titleRes = R.string.perm_accessibility_title,
                whyRes = R.string.perm_accessibility_why,
                checkGranted = { isAccessibilityServiceEnabled() },
                requestPermission = { launchAccessibilitySettings() },
                required = true,
            ),
            // 6. Overlay (Display over other apps)
            PermissionStep(
                iconRes = R.drawable.ic_overlay,
                titleRes = R.string.perm_overlay_title,
                whyRes = R.string.perm_overlay_why,
                checkGranted = { OverlayPermissionHelper.hasPermission(this) },
                requestPermission = {
                    overlayLauncher.launch(OverlayPermissionHelper.createRequestIntent(this))
                },
            ),
        )

        btnGrant.setOnClickListener {
            val step = steps[currentStep]
            if (step.checkGranted()) {
                goToNextStep()
            } else {
                step.requestPermission()
            }
        }

        btnSkip.setOnClickListener {
            val step = steps[currentStep]
            if (step.required && !step.checkGranted()) {
                AlertDialog.Builder(this)
                    .setTitle(getString(step.titleRes))
                    .setMessage(R.string.perm_required_cannot_skip)
                    .setPositiveButton(R.string.onboarding_grant_button) { _, _ -> step.requestPermission() }
                    .setNegativeButton(android.R.string.cancel, null)
                    .show()
            } else {
                goToNextStep()
            }
        }

        buildStepDots()
        showStep(0)
    }

    override fun onResume() {
        super.onResume()
        refreshCurrentStep()
    }

    private fun refreshCurrentStep() {
        if (currentStep < steps.size) {
            val granted = steps[currentStep].checkGranted()
            updateGrantedStatus(granted)
            updateStepDots()
        }
    }

    private fun buildStepDots() {
        llStepDots.removeAllViews()
        for (i in steps.indices) {
            val dot = View(this).apply {
                val size = if (i == 0) dpToPx(24) else dpToPx(8)
                layoutParams = LinearLayout.LayoutParams(size, dpToPx(8)).apply {
                    marginStart = if (i > 0) dpToPx(6) else 0
                    marginEnd = if (i < steps.lastIndex) dpToPx(6) else 0
                }
                background = ContextCompat.getDrawable(
                    this@OnboardingPermissionsActivity,
                    if (i == 0) R.drawable.bg_step_indicator_active else R.drawable.bg_step_indicator,
                )
            }
            llStepDots.addView(dot)
        }
    }

    private fun updateStepDots() {
        for (i in 0 until llStepDots.childCount) {
            val dot = llStepDots.getChildAt(i)
            val (bgRes, width) = when {
                i < currentStep -> R.drawable.bg_step_indicator_done to dpToPx(8)
                i == currentStep -> R.drawable.bg_step_indicator_active to dpToPx(24)
                else -> R.drawable.bg_step_indicator to dpToPx(8)
            }
            dot.background = ContextCompat.getDrawable(this, bgRes)
            val lp = dot.layoutParams as LinearLayout.LayoutParams
            lp.width = width
            dot.layoutParams = lp
        }
    }

    private fun showStep(step: Int) {
        currentStep = step
        val permStep = steps[step]

        tvStepIndicator.text = getString(R.string.onboarding_step_format, step + 1, steps.size)
        ivPermissionIcon.setImageResource(permStep.iconRes)
        tvPermissionTitle.text = getString(permStep.titleRes)
        tvPermissionWhy.text = getString(permStep.whyRes)

        val granted = permStep.checkGranted()
        updateGrantedStatus(granted)
        updateStepDots()
    }

    private fun updateGrantedStatus(granted: Boolean) {
        val step = steps.getOrNull(currentStep)
        if (granted) {
            tvPermissionStatus.visibility = View.VISIBLE
            tvPermissionStatus.text = getString(R.string.permission_granted)
            tvPermissionStatus.setTextColor(ContextCompat.getColor(this, R.color.status_active))
            btnGrant.text = getString(R.string.onboarding_next_button)
        } else {
            tvPermissionStatus.visibility = View.GONE
            btnGrant.text = getString(R.string.onboarding_grant_button)
        }
        // Hide the Skip button on required steps so the user can't bypass them
        btnSkip.visibility = if (step?.required == true && !granted) View.GONE else View.VISIBLE
    }

    private fun goToNextStep() {
        if (currentStep < steps.lastIndex) {
            showStep(currentStep + 1)
        } else {
            // All steps done
            startActivity(Intent(this, OnboardingCompleteActivity::class.java))
            finish()
        }
    }

    // ── Permission checks ───────────────────────────────────────────────

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = getSystemService(AppOpsManager::class.java)
        val mode = appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            packageName,
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun isDeviceAdminActive(): Boolean {
        val dpm = getSystemService(DevicePolicyManager::class.java)
        return dpm.isAdminActive(ParentHelperDeviceAdmin.getComponentName(this))
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.ACCESS_FINE_LOCATION,
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    private fun isBatteryOptimizationExempt(): Boolean {
        val pm = getSystemService(PowerManager::class.java)
        return pm.isIgnoringBatteryOptimizations(packageName)
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false
        val expectedComponent = ComponentName(this, ParentHelperAccessibilityService::class.java)
        return enabledServices.contains(expectedComponent.flattenToString()) ||
            enabledServices.contains("$packageName/")
    }

    private fun launchAccessibilitySettings() {
        AlertDialog.Builder(this)
            .setTitle(R.string.perm_accessibility_title)
            .setMessage(R.string.perm_accessibility_instruction)
            .setPositiveButton(R.string.onboarding_grant_button) { _, _ ->
                // Try the per-service detail page first (Android 14+); fall back to the list.
                val component = ComponentName(this, ParentHelperAccessibilityService::class.java)
                val detailIntent = Intent("android.settings.ACCESSIBILITY_DETAILS_SETTINGS").apply {
                    putExtra(":settings:fragment_args_key", component.flattenToString())
                }
                val launched = try {
                    accessibilityLauncher.launch(detailIntent)
                    true
                } catch (_: Exception) { false }
                if (!launched) {
                    accessibilityLauncher.launch(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                }
                Toast.makeText(this, R.string.perm_accessibility_instruction, Toast.LENGTH_LONG).show()
            }
            .setCancelable(true)
            .show()
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }
}
