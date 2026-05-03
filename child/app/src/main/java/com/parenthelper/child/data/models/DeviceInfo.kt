package com.parenthelper.child.data.models

import com.google.gson.annotations.SerializedName

data class PairingRequest(
    val pairingCode: String,
    val platform: String = "android",
    val model: String,
    val osVersion: String,
    val appVersion: String,
)

data class PairingResponse(
    val deviceId: String,
    val childId: String,
    val parentId: String,
    val deviceToken: String,
)

data class HeartbeatRequest(
    val batteryLevel: Int?,
)

data class HeartbeatResponse(
    val status: String,
)

data class ContentFilterEntry(
    val domain: String,
    val category: String,
)

data class InstalledAppEntry(
    val packageName: String,
    val appName: String,
    // Optional small base64-encoded PNG (no data: prefix). Used by the parent
    // app to render real app icons in the block-app picker. Capped at 64x64
    // to keep sync payload size reasonable.
    val iconBase64: String? = null,
)

data class InstalledAppsSyncRequest(
    val apps: List<InstalledAppEntry>,
)

data class InstalledAppsSyncResponse(
    val status: String,
    val count: Int,
)

data class SosRequest(
    val message: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
)

data class SosResponse(
    val status: String,
    val alertId: String,
)

data class PermissionReportRequest(
    val permission: String,
    val granted: Boolean,
)

data class PermissionReportResponse(
    val status: String,
    val alertId: String? = null,
)
