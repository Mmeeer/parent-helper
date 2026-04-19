package com.parenthelper.child.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.parenthelper.child.BuildConfig
import com.parenthelper.child.data.models.Rule
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "prime_kids_prefs")

class PrefsManager(private val context: Context) {

    private val gson = Gson()

    companion object {
        private val KEY_DEVICE_TOKEN = stringPreferencesKey("device_token")
        private val KEY_DEVICE_ID = stringPreferencesKey("device_id")
        private val KEY_CHILD_ID = stringPreferencesKey("child_id")
        private val KEY_PARENT_ID = stringPreferencesKey("parent_id")
        private val KEY_PAIRED = booleanPreferencesKey("is_paired")
        private val KEY_BASE_URL = stringPreferencesKey("base_url")
        private val KEY_CACHED_RULES = stringPreferencesKey("cached_rules")
        private val KEY_GEOFENCE_STATES = stringPreferencesKey("geofence_states")
        private val KEY_REMOTE_LOCKED = booleanPreferencesKey("remote_locked")
        private val KEY_OVERLAY_REASON = stringPreferencesKey("overlay_reason")
        private val KEY_OVERLAY_DETAIL = stringPreferencesKey("overlay_detail")
    }

    val deviceToken: Flow<String?> = context.dataStore.data.map { it[KEY_DEVICE_TOKEN] }
    val deviceId: Flow<String?> = context.dataStore.data.map { it[KEY_DEVICE_ID] }
    val childId: Flow<String?> = context.dataStore.data.map { it[KEY_CHILD_ID] }
    val parentId: Flow<String?> = context.dataStore.data.map { it[KEY_PARENT_ID] }
    val isPaired: Flow<Boolean> = context.dataStore.data.map { it[KEY_PAIRED] ?: false }
    val baseUrl: Flow<String> = context.dataStore.data.map { it[KEY_BASE_URL] ?: BuildConfig.SERVER_URL }

    suspend fun savePairingData(
        deviceToken: String,
        deviceId: String,
        childId: String,
        parentId: String,
    ) {
        context.dataStore.edit { prefs ->
            prefs[KEY_DEVICE_TOKEN] = deviceToken
            prefs[KEY_DEVICE_ID] = deviceId
            prefs[KEY_CHILD_ID] = childId
            prefs[KEY_PARENT_ID] = parentId
            prefs[KEY_PAIRED] = true
        }
    }

    suspend fun saveBaseUrl(url: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_BASE_URL] = url
        }
    }

    suspend fun cacheRules(rule: Rule) {
        context.dataStore.edit { prefs ->
            prefs[KEY_CACHED_RULES] = gson.toJson(rule)
        }
    }

    val cachedRules: Flow<Rule?> = context.dataStore.data.map { prefs ->
        prefs[KEY_CACHED_RULES]?.let { json ->
            try {
                gson.fromJson(json, Rule::class.java)
            } catch (_: Exception) {
                null
            }
        }
    }

    /**
     * Persist geofence inside/outside states returned by the backend.
     * Map of geofenceId → boolean (true = inside).
     */
    suspend fun saveGeofenceStates(states: Map<String, Boolean>) {
        context.dataStore.edit { prefs ->
            prefs[KEY_GEOFENCE_STATES] = gson.toJson(states)
        }
    }

    @Suppress("UNCHECKED_CAST")
    val geofenceStates: Flow<Map<String, Boolean>> = context.dataStore.data.map { prefs ->
        prefs[KEY_GEOFENCE_STATES]?.let { json ->
            try {
                gson.fromJson(json, Map::class.java) as? Map<String, Boolean> ?: emptyMap()
            } catch (_: Exception) {
                emptyMap()
            }
        } ?: emptyMap()
    }

    // --- Enforcement state persistence (survives reboot / process kill) ---

    val isRemoteLocked: Flow<Boolean> = context.dataStore.data.map { it[KEY_REMOTE_LOCKED] ?: false }

    suspend fun setRemoteLocked(locked: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[KEY_REMOTE_LOCKED] = locked
        }
    }

    val overlayReason: Flow<String?> = context.dataStore.data.map { it[KEY_OVERLAY_REASON] }
    val overlayDetail: Flow<String?> = context.dataStore.data.map { it[KEY_OVERLAY_DETAIL] }

    suspend fun saveOverlayState(reason: String?, detail: String?) {
        context.dataStore.edit { prefs ->
            if (reason != null) {
                prefs[KEY_OVERLAY_REASON] = reason
                if (detail != null) prefs[KEY_OVERLAY_DETAIL] = detail
                else prefs.remove(KEY_OVERLAY_DETAIL)
            } else {
                prefs.remove(KEY_OVERLAY_REASON)
                prefs.remove(KEY_OVERLAY_DETAIL)
            }
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
