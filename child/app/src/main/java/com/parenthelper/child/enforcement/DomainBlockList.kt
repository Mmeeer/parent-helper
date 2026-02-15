package com.parenthelper.child.enforcement

import com.parenthelper.child.data.api.ApiClient
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Maintains a local cache of blocked domains synced from the backend ContentFilter database.
 * Categories from rules determine which domain categories are blocked.
 */
object DomainBlockList {

    private val mutex = Mutex()
    private val blockedDomains = mutableSetOf<String>()

    fun getBlockedDomains(): Set<String> = blockedDomains.toSet()

    suspend fun syncFromServer(categories: List<String>) {
        mutex.withLock {
            try {
                val filters = ApiClient.service.getContentFilters(categories)
                blockedDomains.clear()
                blockedDomains.addAll(filters.map { it.domain.lowercase() })
            } catch (_: Exception) {
                // Keep existing cache on failure
            }
        }
    }

    fun addDomains(domains: List<String>) {
        blockedDomains.addAll(domains.map { it.lowercase() })
    }

    fun clear() {
        blockedDomains.clear()
    }
}
