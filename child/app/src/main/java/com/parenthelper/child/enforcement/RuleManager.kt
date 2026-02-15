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
    private var appBlocker: AppBlocker? = null
    private var previousBlockedApps: List<String> = emptyList()

    fun init(prefs: PrefsManager) {
        prefsManager = prefs
    }

    fun setAppBlocker(blocker: AppBlocker) {
        appBlocker = blocker
    }

    suspend fun fetchRules(childId: String) {
        try {
            val rules = ApiClient.service.getRules(childId)
            applyRules(rules)
            prefsManager?.cacheRules(rules)
        } catch (_: Exception) {
            // Load from cache on failure
            val cached = prefsManager?.cachedRules?.first()
            if (cached != null) {
                applyRules(cached)
            }
        }
    }

    private fun applyRules(rules: Rule) {
        val oldBlocked = _currentRules.value?.blockedApps ?: emptyList()
        _currentRules.value = rules

        // Sync system-level app suspension
        val newBlocked = rules.blockedApps
        appBlocker?.syncSuspendedApps(newBlocked)

        // Unsuspend apps that were removed from the block list
        val unblocked = oldBlocked.filter { it !in newBlocked }
        if (unblocked.isNotEmpty()) {
            appBlocker?.unsuspendApps(unblocked)
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
