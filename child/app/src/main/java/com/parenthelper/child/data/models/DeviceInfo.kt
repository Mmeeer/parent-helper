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
