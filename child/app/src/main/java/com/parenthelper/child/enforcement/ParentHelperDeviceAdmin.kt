package com.parenthelper.child.enforcement

import android.app.admin.DeviceAdminReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.Toast
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.ActivitySyncRequest
import com.parenthelper.child.data.models.BlockedAttempt
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * Device administrator receiver that prevents app uninstallation
 * and reports uninstall attempts to the parent.
 */
class ParentHelperDeviceAdmin : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "Parent Helper protection enabled", Toast.LENGTH_SHORT).show()
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        // Report uninstall/disable attempt to parent
        reportUninstallAttempt(context)
        return "Disabling device admin will remove parental controls. The parent will be notified."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        // Report that admin was actually disabled
        reportUninstallAttempt(context)
    }

    private fun reportUninstallAttempt(context: Context) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = ParentHelperApp.instance.prefsManager
                val childId = prefs.childId.first() ?: return@launch
                val isPaired = prefs.isPaired.first()
                if (!isPaired) return@launch

                val deviceId = prefs.deviceId.first() ?: return@launch
                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val now = Date()

                ApiClient.service.syncActivity(
                    ActivitySyncRequest(
                        childId = childId,
                        deviceId = deviceId,
                        date = dateFormat.format(now),
                        apps = emptyList(),
                        web = emptyList(),
                        location = emptyList(),
                        blockedAttempts = listOf(
                            BlockedAttempt(
                                type = "uninstall_attempt",
                                target = context.packageName,
                                timestamp = isoFormat.format(now),
                            )
                        ),
                    )
                )
            } catch (_: Exception) {
                // Best effort
            }
        }
    }

    companion object {
        fun getComponentName(context: Context): ComponentName {
            return ComponentName(context, ParentHelperDeviceAdmin::class.java)
        }
    }
}
