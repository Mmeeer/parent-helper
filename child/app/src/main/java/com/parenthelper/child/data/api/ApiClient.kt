package com.parenthelper.child.data.api

import com.parenthelper.child.data.local.PrefsManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private var retrofit: Retrofit? = null
    private var prefsManager: PrefsManager? = null
    private var _service: ApiService? = null

    fun init(baseUrl: String, prefsManager: PrefsManager) {
        this.prefsManager = prefsManager
        this._service = null

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val authInterceptor = Interceptor { chain ->
            val token = runBlocking {
                prefsManager.deviceToken.first()
            }
            val request = if (token != null) {
                chain.request().newBuilder()
                    .addHeader("X-Device-Token", token)
                    .build()
            } else {
                chain.request()
            }
            val response = chain.proceed(request)

            // If we sent a deviceToken and the server still rejected us with
            // 401, the device has been unpaired on the backend (typical after
            // the parent taps "Replace Device" while we were offline). Wipe
            // local state and bounce to the pairing screen — same as the
            // realtime device:unpaired event.
            if (response.code == 401 && token != null) {
                com.parenthelper.child.realtime.SocketManager.handleForcedUnpair()
            }
            response
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val service: ApiService
        get() {
            _service?.let { return it }
            val r = retrofit ?: throw IllegalStateException("ApiClient not initialized. Call init() first.")
            return r.create(ApiService::class.java).also { _service = it }
        }
}
