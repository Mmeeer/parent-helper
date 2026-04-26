package com.parenthelper.child.services

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.parenthelper.child.collectors.WebActivityCollector
import com.parenthelper.child.enforcement.RuleManager

class ParentHelperAccessibilityService : AccessibilityService() {

    private var lastForegroundPackage: String? = null
    private var lastUrl: String? = null

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return
        val packageName = event.packageName?.toString() ?: return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> handleWindowChange(packageName)
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED,
            AccessibilityEvent.TYPE_VIEW_TEXT_SELECTION_CHANGED -> {
                if (packageName in BROWSER_PACKAGES) extractUrlFromBrowser(packageName)
            }
        }
    }

    private fun handleWindowChange(packageName: String) {
        if (packageName == lastForegroundPackage) return
        lastForegroundPackage = packageName

        if (packageName == applicationContext.packageName) return
        if (packageName.startsWith("com.android.systemui")) return

        if (RuleManager.isAppBlocked(packageName)) {
            Log.d(TAG, "Blocked app launched, sending back to home: $packageName")
            performGlobalAction(GLOBAL_ACTION_HOME)
        }

        if (packageName in BROWSER_PACKAGES) extractUrlFromBrowser(packageName)
    }

    private fun extractUrlFromBrowser(packageName: String) {
        val root = rootInActiveWindow ?: return
        val urlBarId = URL_BAR_IDS[packageName] ?: return
        try {
            val nodes = root.findAccessibilityNodeInfosByViewId(urlBarId)
            for (node in nodes) {
                val text = node.text?.toString() ?: continue
                if (text.isBlank() || text == lastUrl) continue
                lastUrl = text
                val domain = extractDomain(text) ?: continue
                WebActivityCollector.recordVisit(domain)
                break
            }
        } catch (e: Exception) {
            Log.w(TAG, "URL extraction failed for $packageName", e)
        }
    }

    private fun extractDomain(input: String): String? {
        val cleaned = input.trim().removePrefix("http://").removePrefix("https://")
        if (cleaned.isEmpty() || !cleaned.contains('.')) return null
        return cleaned.substringBefore('/').substringBefore(':').lowercase()
    }

    override fun onInterrupt() {}

    companion object {
        private const val TAG = "PHAccessibility"

        private val BROWSER_PACKAGES = setOf(
            "com.android.chrome",
            "com.brave.browser",
            "org.mozilla.firefox",
            "com.opera.browser",
            "com.opera.mini.native",
            "com.microsoft.emmx",
            "com.sec.android.app.sbrowser",
            "com.duckduckgo.mobile.android",
            "com.UCMobile.intl",
        )

        private val URL_BAR_IDS = mapOf(
            "com.android.chrome" to "com.android.chrome:id/url_bar",
            "com.brave.browser" to "com.brave.browser:id/url_bar",
            "org.mozilla.firefox" to "org.mozilla.firefox:id/mozac_browser_toolbar_url_view",
            "com.microsoft.emmx" to "com.microsoft.emmx:id/url_bar",
            "com.sec.android.app.sbrowser" to "com.sec.android.app.sbrowser:id/location_bar_edit_text",
            "com.duckduckgo.mobile.android" to "com.duckduckgo.mobile.android:id/omnibarTextInput",
            "com.opera.browser" to "com.opera.browser:id/url_field",
        )
    }
}
