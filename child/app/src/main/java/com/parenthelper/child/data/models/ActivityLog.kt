package com.parenthelper.child.data.models

data class ActivitySyncRequest(
    val childId: String,
    val deviceId: String,
    val date: String,
    val apps: List<AppUsageEntry>?,
    val web: List<WebEntry>?,
    val location: List<LocationEntry>?,
    val blockedAttempts: List<BlockedAttempt>?,
)

data class AppUsageEntry(
    val packageName: String,
    val appName: String,
    val durationMin: Int,
)

data class WebEntry(
    val url: String,
    val timestamp: String,
    val blocked: Boolean,
)

data class LocationEntry(
    val lat: Double,
    val lng: Double,
    val timestamp: String,
)

data class BlockedAttempt(
    val type: String,
    val target: String,
    val timestamp: String,
)

data class ActivitySyncResponse(
    val status: String,
    val id: String,
)
