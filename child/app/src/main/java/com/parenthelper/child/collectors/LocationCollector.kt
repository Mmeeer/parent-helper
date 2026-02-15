package com.parenthelper.child.collectors

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Looper
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import com.parenthelper.child.data.models.LocationEntry
import java.text.SimpleDateFormat
import java.util.*

class LocationCollector(private val context: Context) {

    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    private var locationCallback: LocationCallback? = null

    fun startTracking() {
        if (ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION,
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            LOCATION_INTERVAL_MS,
        ).setMinUpdateIntervalMillis(MIN_LOCATION_INTERVAL_MS)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }

                synchronized(recentLocations) {
                    recentLocations.add(
                        LocationEntry(
                            lat = location.latitude,
                            lng = location.longitude,
                            timestamp = dateFormat.format(Date()),
                        )
                    )
                }
            }
        }

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback!!,
            Looper.getMainLooper(),
        )
    }

    fun stopTracking() {
        locationCallback?.let { fusedLocationClient.removeLocationUpdates(it) }
        locationCallback = null
    }

    companion object {
        private const val LOCATION_INTERVAL_MS = 10 * 60 * 1000L // 10 minutes
        private const val MIN_LOCATION_INTERVAL_MS = 5 * 60 * 1000L // 5 minutes

        private val recentLocations = mutableListOf<LocationEntry>()

        fun getRecentLocations(): List<LocationEntry> {
            synchronized(recentLocations) {
                return recentLocations.toList()
            }
        }

        fun clearRecentLocations() {
            synchronized(recentLocations) {
                recentLocations.clear()
            }
        }
    }
}
