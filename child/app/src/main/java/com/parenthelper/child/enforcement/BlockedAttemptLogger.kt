package com.parenthelper.child.enforcement

import android.util.Log
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Logs blocked domain attempts for parent dashboard reporting.
 * Accumulates attempts in memory and provides them for the next activity sync.
 */
object BlockedAttemptLogger {

    private const val TAG = "BlockedAttemptLogger"
    private const val MAX_PENDING = 500
    private val mutex = Mutex()

    data class BlockedAttempt(
        val domain: String,
        val timestamp: Long,
        val category: String?,
    )

    private val pendingAttempts = mutableListOf<BlockedAttempt>()

    fun logBlocked(domain: String, category: String? = null) {
        synchronized(pendingAttempts) {
            if (pendingAttempts.size >= MAX_PENDING) {
                pendingAttempts.removeAt(0) // Drop oldest
            }
            pendingAttempts.add(BlockedAttempt(domain, System.currentTimeMillis(), category))
            Log.d(TAG, "Blocked: $domain (${category ?: "custom"})")
        }
    }

    /**
     * Returns and clears all pending blocked attempts for sync to backend.
     */
    suspend fun drainAttempts(): List<BlockedAttempt> {
        mutex.withLock {
            val copy = pendingAttempts.toList()
            pendingAttempts.clear()
            return copy
        }
    }

    fun pendingCount(): Int = synchronized(pendingAttempts) { pendingAttempts.size }
}
