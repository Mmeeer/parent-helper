package com.parenthelper.child.enforcement

import java.util.*

/**
 * Utility to check whether device usage is currently blocked by schedule rules.
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
            day in schedule.days &&
                schedule.blocked &&
                currentTime >= schedule.startTime &&
                currentTime <= schedule.endTime
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
            day in schedule.days &&
                schedule.blocked &&
                currentTime >= schedule.startTime &&
                currentTime <= schedule.endTime
        }

        return activeSchedule?.endTime
    }
}
