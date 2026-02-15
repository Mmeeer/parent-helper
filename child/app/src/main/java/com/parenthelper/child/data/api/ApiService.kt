package com.parenthelper.child.data.api

import com.parenthelper.child.data.models.*
import retrofit2.http.*

interface ApiService {

    @POST("devices/complete-pairing")
    suspend fun completePairing(@Body request: PairingRequest): PairingResponse

    @POST("devices/heartbeat")
    suspend fun heartbeat(@Body request: HeartbeatRequest): HeartbeatResponse

    @GET("rules/{childId}")
    suspend fun getRules(@Path("childId") childId: String): Rule

    @POST("activity/sync")
    suspend fun syncActivity(@Body request: ActivitySyncRequest): ActivitySyncResponse
}
