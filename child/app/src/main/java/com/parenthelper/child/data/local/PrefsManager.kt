package com.parenthelper.child.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.parenthelper.child.data.models.Rule
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "parent_helper_prefs")

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
    }

    val deviceToken: Flow<String?> = context.dataStore.data.map { it[KEY_DEVICE_TOKEN] }
    val deviceId: Flow<String?> = context.dataStore.data.map { it[KEY_DEVICE_ID] }
    val childId: Flow<String?> = context.dataStore.data.map { it[KEY_CHILD_ID] }
    val parentId: Flow<String?> = context.dataStore.data.map { it[KEY_PARENT_ID] }
    val isPaired: Flow<Boolean> = context.dataStore.data.map { it[KEY_PAIRED] ?: false }
    val baseUrl: Flow<String> = context.dataStore.data.map { it[KEY_BASE_URL] ?: "http://10.0.2.2:3000/" }

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

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
