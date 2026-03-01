package com.parenthelper.child

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.local.PrefsManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

class ParentHelperApp : Application() {

    lateinit var prefsManager: PrefsManager
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        prefsManager = PrefsManager(this)

        val baseUrl = runBlocking { prefsManager.baseUrl.first() }
        ApiClient.init(baseUrl, prefsManager)

        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        val monitoringChannel = NotificationChannel(
            CHANNEL_MONITORING,
            getString(R.string.channel_monitoring),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Persistent notification for monitoring service"
            setShowBadge(false)
        }

        val alertsChannel = NotificationChannel(
            CHANNEL_ALERTS,
            getString(R.string.channel_alerts),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Alert notifications"
        }

        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(monitoringChannel)
        manager.createNotificationChannel(alertsChannel)
    }

    companion object {
        const val CHANNEL_MONITORING = "monitoring"
        const val CHANNEL_ALERTS = "alerts"

        lateinit var instance: ParentHelperApp
            private set
    }
}
