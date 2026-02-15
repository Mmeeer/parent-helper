package com.parenthelper.child.enforcement

import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.local.PrefsManager
import com.parenthelper.child.data.models.Rule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first

object RuleManager {

    private val _currentRules = MutableStateFlow<Rule?>(null)
    val currentRules: StateFlow<Rule?> = _currentRules

    private var prefsManager: PrefsManager? = null

    fun init(prefs: PrefsManager) {
        prefsManager = prefs
    }

    suspend fun fetchRules(childId: String) {
        try {
            val rules = ApiClient.service.getRules(childId)
            _currentRules.value = rules
            prefsManager?.cacheRules(rules)
        } catch (_: Exception) {
            // Load from cache on failure
            val cached = prefsManager?.cachedRules?.first()
            if (cached != null) {
                _currentRules.value = cached
            }
        }
    }

    fun updateRules(rules: Rule) {
        _currentRules.value = rules
    }

    fun isAppBlocked(packageName: String): Boolean {
        return _currentRules.value?.blockedApps?.contains(packageName) == true
    }

    fun getDailyLimitMin(): Int? {
        return _currentRules.value?.screenTime?.dailyLimitMin
    }

    fun getAppLimitMin(packageName: String): Int? {
        return _currentRules.value?.screenTime?.perApp
            ?.find { it.appId == packageName }?.limitMin
    }
}
