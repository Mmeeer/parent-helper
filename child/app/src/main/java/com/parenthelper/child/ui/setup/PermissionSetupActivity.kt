package com.parenthelper.child.ui.setup

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.parenthelper.child.R
import com.parenthelper.child.enforcement.OverlayPermissionHelper
import com.parenthelper.child.ui.main.MainActivity

/**
 * Post-pairing setup screen that guides the user through granting
 * SYSTEM_ALERT_WINDOW permission. This is the first screen shown
 * after a successful device pairing.
 *
 * The overlay permission is critical for screen time enforcement —
 * without it the app cannot block device usage when limits are exceeded.
 */
class PermissionSetupActivity : AppCompatActivity() {

    private lateinit var btnGrantOverlay: MaterialButton
    private lateinit var btnContinue: MaterialButton
    private lateinit var tvOverlayStatus: TextView

    private val overlayPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { _ ->
        updateOverlayStatus()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_permission_setup)

        btnGrantOverlay = findViewById(R.id.btnGrantOverlay)
        btnContinue = findViewById(R.id.btnContinue)
        tvOverlayStatus = findViewById(R.id.tvOverlayStatus)

        btnGrantOverlay.setOnClickListener {
            overlayPermissionLauncher.launch(OverlayPermissionHelper.createRequestIntent(this))
        }

        btnContinue.setOnClickListener {
            navigateToMain()
        }

        updateOverlayStatus()
    }

    override fun onResume() {
        super.onResume()
        updateOverlayStatus()
    }

    private fun updateOverlayStatus() {
        val granted = OverlayPermissionHelper.hasPermission(this)

        if (granted) {
            tvOverlayStatus.text = getString(R.string.permission_granted)
            tvOverlayStatus.setTextColor(ContextCompat.getColor(this, R.color.status_active))
            btnGrantOverlay.visibility = View.GONE
            btnContinue.text = getString(R.string.permission_continue)
            btnContinue.setTextColor(ContextCompat.getColor(this, R.color.primary))

            OverlayPermissionHelper.reportPermissionRestored()
        } else {
            tvOverlayStatus.text = getString(R.string.permission_not_granted)
            tvOverlayStatus.setTextColor(ContextCompat.getColor(this, R.color.status_warning))
            btnGrantOverlay.visibility = View.VISIBLE
            btnContinue.text = getString(R.string.permission_skip)
            btnContinue.setTextColor(ContextCompat.getColor(this, R.color.text_secondary))
        }
    }

    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
