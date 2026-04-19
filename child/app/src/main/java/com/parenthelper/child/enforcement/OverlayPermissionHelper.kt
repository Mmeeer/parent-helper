package com.parenthelper.child.enforcement

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.PermissionReportRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Manages the SYSTEM_ALERT_WINDOW permission lifecycle.
 *
 * - Checks whether the permission is currently granted.
 * - Creates the intent to open the system overlay settings page.
 * - Reports permission revocation to the backend so the parent is alerted.
 */
object OverlayPermissionHelper {

    private const val TAG = "OverlayPermission"
    const val PERMISSION_NAME = "SYSTEM_ALERT_WINDOW"

    /** Whether the app is currently allowed to draw overlays. */
    fun hasPermission(context: Context): Boolean {
        return Settings.canDrawOverlays(context)
    }

    /**
     * Returns an intent that opens the system settings page where the user
     * can grant "Display over other apps" for this package.
     */
    fun createRequestIntent(context: Context): Intent {
        return Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${context.packageName}"),
        )
    }

    /**
     * Report to the backend that overlay permission has been revoked.
     * The backend creates an alert for the parent and sends a push notification.
     */
    fun reportPermissionRevoked() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                ApiClient.service.reportPermission(
                    PermissionReportRequest(
                        permission = PERMISSION_NAME,
                        granted = false,
                    )
                )
                Log.d(TAG, "Reported overlay permission revoked to server")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to report overlay permission revocation: ${e.message}")
            }
        }
    }

    /**
     * Report to the backend that overlay permission has been restored.
     */
    fun reportPermissionRestored() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                ApiClient.service.reportPermission(
                    PermissionReportRequest(
                        permission = PERMISSION_NAME,
                        granted = true,
                    )
                )
                Log.d(TAG, "Reported overlay permission restored to server")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to report overlay permission restoration: ${e.message}")
            }
        }
    }
}
