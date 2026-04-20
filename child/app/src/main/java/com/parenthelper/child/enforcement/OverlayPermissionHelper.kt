package com.parenthelper.child.enforcement

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.R
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.PermissionReportRequest
import com.parenthelper.child.ui.main.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Manages the SYSTEM_ALERT_WINDOW permission lifecycle.
 *
 * - Checks whether the permission is currently granted.
 * - Creates the intent to open the system overlay settings page.
 * - Reports permission revocation to the backend so the parent is alerted.
 * - Shows a persistent notification when permission is missing and enforcement
 *   cannot be applied, guiding the user back to grant the permission.
 */
object OverlayPermissionHelper {

    private const val TAG = "OverlayPermission"
    const val PERMISSION_NAME = "SYSTEM_ALERT_WINDOW"
    private const val NOTIFICATION_ID_PERMISSION_LOST = 2001

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

    /**
     * Show a persistent notification indicating that overlay permission is
     * missing and enforcement cannot be applied. Tapping opens MainActivity
     * which will prompt re-granting. Called from MonitoringService when
     * enforcement is needed but the permission has been revoked.
     */
    fun showPermissionLostNotification(context: Context) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context, NOTIFICATION_ID_PERMISSION_LOST, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, ParentHelperApp.CHANNEL_ALERTS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(context.getString(R.string.overlay_permission_lost_title))
            .setContentText(context.getString(R.string.overlay_permission_lost_text))
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(false)
            .build()

        val manager = context.getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID_PERMISSION_LOST, notification)
        Log.d(TAG, "Shown permission-lost notification")
    }

    /**
     * Dismiss the permission-lost notification (called when permission is restored).
     */
    fun dismissPermissionLostNotification(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.cancel(NOTIFICATION_ID_PERMISSION_LOST)
        Log.d(TAG, "Dismissed permission-lost notification")
    }
}
