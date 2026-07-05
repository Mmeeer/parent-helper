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

    /**
     * Always-blocked DoH (DNS-over-HTTPS) bootstrap hostnames.
     *
     * Modern browsers (Chrome, Firefox) ship DoH on by default. Their "Automatic"
     * upgrade mode resolves these hostnames via system DNS to find the DoH server,
     * then sends every subsequent DNS lookup over HTTPS to it — totally bypassing
     * our DNS-level filter.
     *
     * By NXDOMAIN'ing the bootstrap lookup itself, the browser fails to find the
     * DoH server and falls back to plain UDP/53, which our VPN intercepts.
     *
     * This list does NOT need to be configurable — it's a hard-coded counter to
     * the DoH bypass and applies to every paired device regardless of parent rules.
     */
    private val DOH_BOOTSTRAP_HOSTS = setOf(
        // Google
        "dns.google",
        "dns.google.com",
        // Cloudflare
        "cloudflare-dns.com",
        "chrome.cloudflare-dns.com",
        "mozilla.cloudflare-dns.com",
        "security.cloudflare-dns.com",
        "family.cloudflare-dns.com",
        "one.one.one.one",
        // Quad9
        "dns.quad9.net",
        "dns9.quad9.net",
        "dns10.quad9.net",
        "dns11.quad9.net",
        // OpenDNS
        "doh.opendns.com",
        "doh.familyshield.opendns.com",
        // CleanBrowsing
        "doh.cleanbrowsing.org",
        "family-filter-dns.cleanbrowsing.org",
        // AdGuard
        "dns.adguard.com",
        "dns-family.adguard.com",
        "dns-unfiltered.adguard.com",
        // NextDNS
        "dns.nextdns.io",
        // Mozilla DoH canary (used by Firefox auto-upgrade)
        "use-application-dns.net",
    )

    fun isBlocked(domain: String): Boolean {
        val lower = domain.lowercase()

        // Allow list takes priority
        if (matchesDomainSet(lower, customAllowDomains)) return false

        // Always block DoH bootstrap hosts — these are not subject to allow-list,
        // not configurable by parents, and not loggable as a "blocked domain"
        // since they're an enforcement counter to DoH bypass, not a user-visible
        // category violation. Check via suffix match so subdomains are caught too.
        if (matchesDomainSet(lower, DOH_BOOTSTRAP_HOSTS)) return true

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
