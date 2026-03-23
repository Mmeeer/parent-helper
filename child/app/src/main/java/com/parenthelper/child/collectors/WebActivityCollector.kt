package com.parenthelper.child.collectors

import com.parenthelper.child.data.models.BlockedAttempt
import com.parenthelper.child.data.models.WebEntry
import java.text.SimpleDateFormat
import java.util.*

/**
 * Collects DNS-level web activity from the VPN service.
 * Tracks visited domains and blocked attempts.
 * Deduplicates repeated DNS queries for the same domain within a short window.
 */
object WebActivityCollector {

    private val lock = Any()
    private val webEntries = mutableListOf<WebEntry>()
    private val blockedAttempts = mutableListOf<BlockedAttempt>()

    // Tracks domain -> last recorded timestamp to deduplicate rapid DNS queries
    private val recentVisits = mutableMapOf<String, Long>()
    private val recentBlocks = mutableMapOf<String, Long>()
    private const val DEDUP_WINDOW_MS = 60_000L // 60 seconds

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    // Internal DNS domains to ignore
    private val ignoredSuffixes = listOf(
        ".arpa", ".local", ".internal",
        ".googleapis.com", ".gstatic.com", ".google.com",
        ".android.com", ".gvt1.com", ".gvt2.com",
        ".1e100.net",
    )

    private fun shouldTrack(domain: String): Boolean {
        if (domain.isEmpty()) return false
        for (suffix in ignoredSuffixes) {
            if (domain.endsWith(suffix) || domain == suffix.removePrefix(".")) return false
        }
        if (!domain.contains('.')) return false
        return true
    }

    fun recordVisit(domain: String) {
        if (!shouldTrack(domain)) return
        val now = System.currentTimeMillis()
        synchronized(lock) {
            val lastSeen = recentVisits[domain]
            if (lastSeen != null && now - lastSeen < DEDUP_WINDOW_MS) return
            recentVisits[domain] = now
            webEntries.add(
                WebEntry(
                    url = domain,
                    timestamp = dateFormat.format(Date(now)),
                    blocked = false,
                )
            )
        }
    }

    fun recordBlocked(domain: String) {
        if (!shouldTrack(domain)) return
        val now = System.currentTimeMillis()
        synchronized(lock) {
            val lastSeen = recentBlocks[domain]
            if (lastSeen != null && now - lastSeen < DEDUP_WINDOW_MS) return
            recentBlocks[domain] = now
            val timestamp = dateFormat.format(Date(now))
            webEntries.add(
                WebEntry(
                    url = domain,
                    timestamp = timestamp,
                    blocked = true,
                )
            )
            blockedAttempts.add(
                BlockedAttempt(
                    type = "web",
                    target = domain,
                    timestamp = timestamp,
                )
            )
        }
    }

    /**
     * Atomically drains all collected web entries and blocked attempts.
     * Returns a pair of (webEntries, blockedAttempts) and clears the internal lists.
     * This prevents double-counting when multiple callers (worker + manual sync) overlap.
     */
    fun drainAll(): Pair<List<WebEntry>, List<BlockedAttempt>> {
        synchronized(lock) {
            val web = webEntries.toList()
            val blocked = blockedAttempts.toList()
            webEntries.clear()
            blockedAttempts.clear()
            return Pair(web, blocked)
        }
    }
}
