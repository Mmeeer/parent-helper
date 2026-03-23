package com.parenthelper.child.enforcement

import android.util.Log
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.WebFilter
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Maintains a local cache of blocked domains synced from the backend ContentFilter database.
 * Supports category-based filtering, custom block/allow lists, and efficient subdomain matching
 * using a reversed-label hash set for O(n) lookup where n = label count of the queried domain.
 */
object DomainBlockList {

    private const val TAG = "DomainBlockList"
    private val mutex = Mutex()

    // Reversed domain labels for efficient suffix matching
    // e.g., "evil.example.com" stored as "com.example.evil"
    private val reversedBlockedDomains = mutableSetOf<String>()
    private val customAllowDomains = mutableSetOf<String>()
    private var activeCategories = listOf<String>()

    fun isBlocked(domain: String): Boolean {
        val lower = domain.lowercase()

        // Allow list takes priority
        if (matchesDomainSet(lower, customAllowDomains)) return false

        // Check against blocked domains (supports subdomain matching)
        return matchesReversedSet(lower)
    }

    private fun matchesDomainSet(domain: String, domainSet: Set<String>): Boolean {
        if (domainSet.isEmpty()) return false
        for (allowed in domainSet) {
            if (domain == allowed || domain.endsWith(".$allowed")) return true
        }
        return false
    }

    /**
     * Efficient subdomain matching using reversed labels.
     * "sub.evil.com" reversed is "com.evil.sub"
     * If "com.evil" is in the set, then "com.evil.sub" starts with "com.evil." → blocked.
     */
    private fun matchesReversedSet(domain: String): Boolean {
        val reversed = reverseDomain(domain)
        // Check exact match
        if (reversed in reversedBlockedDomains) return true
        // Check if any parent domain is blocked (subdomain matching)
        val parts = reversed.split(".")
        val sb = StringBuilder()
        for (i in parts.indices) {
            if (i > 0) sb.append(".")
            sb.append(parts[i])
            if (sb.toString() in reversedBlockedDomains) return true
        }
        return false
    }

    private fun reverseDomain(domain: String): String {
        return domain.split(".").reversed().joinToString(".")
    }

    /**
     * Full sync: fetch domains for active categories from server,
     * then apply custom block/allow lists from rules.
     */
    suspend fun syncFromRules(webFilter: WebFilter?) {
        if (webFilter == null) return
        mutex.withLock {
            activeCategories = webFilter.categories
            customAllowDomains.clear()
            customAllowDomains.addAll(webFilter.customAllow.map { it.lowercase() })

            // Fetch category-based domains from backend
            reversedBlockedDomains.clear()
            if (webFilter.categories.isNotEmpty()) {
                try {
                    val filters = ApiClient.service.getContentFilters(webFilter.categories)
                    for (entry in filters) {
                        reversedBlockedDomains.add(reverseDomain(entry.domain.lowercase()))
                    }
                    Log.i(TAG, "Synced ${filters.size} domains for categories: ${webFilter.categories}")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to sync from server, keeping existing cache: ${e.message}")
                }
            }

            // Add custom blocked domains
            for (domain in webFilter.customBlock) {
                reversedBlockedDomains.add(reverseDomain(domain.lowercase()))
            }

            Log.i(TAG, "Block list: ${reversedBlockedDomains.size} domains, allow list: ${customAllowDomains.size}")
        }
    }

    /** Legacy compatibility — used by MonitoringService */
    suspend fun syncFromServer(categories: List<String>) {
        mutex.withLock {
            activeCategories = categories
            try {
                val filters = ApiClient.service.getContentFilters(categories)
                reversedBlockedDomains.clear()
                for (entry in filters) {
                    reversedBlockedDomains.add(reverseDomain(entry.domain.lowercase()))
                }
            } catch (_: Exception) {
                // Keep existing cache
            }
        }
    }

    fun addDomains(domains: List<String>) {
        for (domain in domains) {
            reversedBlockedDomains.add(reverseDomain(domain.lowercase()))
        }
    }

    fun getBlockedDomains(): Set<String> {
        // Return original (non-reversed) domains for backward compat
        return reversedBlockedDomains.map { reverseDomain(it) }.toSet()
    }

    fun clear() {
        reversedBlockedDomains.clear()
        customAllowDomains.clear()
    }

    fun domainCount(): Int = reversedBlockedDomains.size
}
