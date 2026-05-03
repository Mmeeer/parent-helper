package com.parenthelper.child.collectors

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import android.util.Log
import java.io.ByteArrayOutputStream

data class InstalledAppInfo(
    val packageName: String,
    val appName: String,
    val iconBase64: String? = null,
)

/**
 * Collects the list of user-installed apps (excludes system apps).
 */
object InstalledAppsCollector {

    private const val TAG = "InstalledAppsCollector"
    private const val ICON_SIZE_PX = 64

    fun getInstalledApps(context: Context): List<InstalledAppInfo> {
        val pm = context.packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)

        return apps
            .filter { app ->
                // Only user-installed apps (not system)
                (app.flags and ApplicationInfo.FLAG_SYSTEM) == 0 &&
                    app.packageName != context.packageName
            }
            .map { app ->
                InstalledAppInfo(
                    packageName = app.packageName,
                    appName = pm.getApplicationLabel(app).toString(),
                    iconBase64 = encodeIconSafely(pm, app.packageName),
                )
            }
            .sortedBy { it.appName.lowercase() }
    }

    private fun encodeIconSafely(pm: PackageManager, packageName: String): String? {
        return try {
            val drawable = pm.getApplicationIcon(packageName)
            val bitmap = drawableToBitmap(drawable, ICON_SIZE_PX)
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to encode icon for $packageName: ${e.message}")
            null
        }
    }

    private fun drawableToBitmap(drawable: Drawable, sizePx: Int): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null &&
            drawable.bitmap.width == sizePx && drawable.bitmap.height == sizePx
        ) {
            return drawable.bitmap
        }
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, sizePx, sizePx)
        drawable.draw(canvas)
        return bitmap
    }
}
