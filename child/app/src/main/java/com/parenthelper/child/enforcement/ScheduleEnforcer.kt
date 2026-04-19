package com.parenthelper.child.enforcement

import java.util.*

/**
 * Utility to check whether device usage is currently blocked by schedule rules.
 * Supports both same-day schedules (e.g. 22:00–06:00 wraps to next day)
 * and standard schedules (e.g. 08:00–15:00).
 */
object ScheduleEnforcer {

    fun isCurrentlyBlocked(): Boolean {
        val rules = RuleManager.currentRules.value ?: return false
        val schedules = rules.screenTime?.schedule ?: return false

        val now = Calendar.getInstance()
        val day = now.get(Calendar.DAY_OF_WEEK) - 1 // 0=Sunday
        val currentTime = String.format(
            "%02d:%02d",
            now.get(Calendar.HOUR_OF_DAY),
            now.get(Calendar.MINUTE),
        )

        return schedules.any { schedule ->
            schedule.blocked && isTimeInSchedule(day, currentTime, schedule)
        }
    }

    fun getNextUnblockTime(): String? {
        val rules = RuleManager.currentRules.value ?: return null
        val schedules = rules.screenTime?.schedule ?: return null

        val now = Calendar.getInstance()
        val day = now.get(Calendar.DAY_OF_WEEK) - 1
        val currentTime = String.format(
            "%02d:%02d",
            now.get(Calendar.HOUR_OF_DAY),
            now.get(Calendar.MINUTE),
        )

        val activeSchedule = schedules.find { schedule ->
            schedule.blocked && isTimeInSchedule(day, currentTime, schedule)
        }

        return activeSchedule?.endTime
    }

    /**
     * Checks if the given day+time falls within a schedule.
     * Handles cross-midnight schedules (startTime > endTime) correctly.
     */
    private fun isTimeInSchedule(day: Int, currentTime: String, schedule: com.parenthelper.child.data.models.Schedule): Boolean {
        return if (schedule.startTime <= schedule.endTime) {
            // Same-day schedule (e.g. 08:00 - 15:00)
            day in schedule.days &&
                currentTime >= schedule.startTime &&
                currentTime <= schedule.endTime
        } else {
            // Cross-midnight schedule (e.g. 22:00 - 06:00)
            // Blocked if: today is a scheduled day AND time >= start,
            //         OR: yesterday was a scheduled day AND time <= end
            val yesterday = if (day == 0) 6 else day - 1
            (day in schedule.days && currentTime >= schedule.startTime) ||
                (yesterday in schedule.days && currentTime <= schedule.endTime)
        }
    }
}
