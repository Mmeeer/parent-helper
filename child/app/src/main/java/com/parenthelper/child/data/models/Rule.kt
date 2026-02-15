package com.parenthelper.child.data.models

data class Rule(
    val childId: String,
    val screenTime: ScreenTime?,
    val blockedApps: List<String>,
    val webFilter: WebFilter?,
)

data class ScreenTime(
    val dailyLimitMin: Int,
    val perApp: List<PerAppLimit>,
    val schedule: List<Schedule>,
)

data class PerAppLimit(
    val appId: String,
    val appName: String,
    val limitMin: Int,
)

data class Schedule(
    val days: List<Int>,
    val startTime: String,
    val endTime: String,
    val blocked: Boolean,
)

data class WebFilter(
    val categories: List<String>,
    val customBlock: List<String>,
    val customAllow: List<String>,
)
