package com.parenthelper.child.data.models

data class Command(
    val command: String,
    val params: Map<String, Any>?,
)
