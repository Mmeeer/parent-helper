package com.parenthelper.child.enforcement

import android.util.Log
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.local.PrefsManager
import com.parenthelper.child.data.models.Rule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first

object RuleManager {

    private const val TAG = "RuleManager"
    private val _currentRules = MutableStateFlow<Rule?>(null)
    val currentRules: StateFlow<Rule?> = _currentRules

    /** True once rules have been successfully loaded (from API or cache). */
    @Volatile
    var rulesLoaded = false
        private set

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
            rulesLoaded = true
        } catch (_: Exception) {
            // Load from cache on failure
            val cached = prefsManager?.cachedRules?.first()
            if (cached != null) {
                applyRules(cached)
                rulesLoaded = true
            } else {
                Log.w(TAG, "Rules fetch failed and no cache — fail-closed: blocking all non-system apps")
                rulesLoaded = false
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
        rulesLoaded = true
    }

    /**
     * Fail-closed: if rules have never been loaded (API down + empty cache),
     * block all non-system apps rather than allowing everything.
     */
    fun isAppBlocked(packageName: String): Boolean {
        if (!rulesLoaded) return true
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
