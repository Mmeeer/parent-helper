package com.parenthelper.child.enforcement

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Full-screen overlay that blocks device usage when screen time limits
 * are exceeded or during scheduled block times.
 *
 * Uses SYSTEM_ALERT_WINDOW (TYPE_APPLICATION_OVERLAY) so it covers all apps.
 * The overlay intercepts all touches and key events to prevent the child
 * from navigating away or interacting with apps behind it.
 */
object LockScreenOverlay {
    private const val TAG = "LockScreenOverlay"
    private var overlayView: View? = null
    private var windowManager: WindowManager? = null
    private val handler = Handler(Looper.getMainLooper())
    private var currentReason: Reason? = null

    enum class Reason {
        DAILY_LIMIT,
        APP_LIMIT,
        SCHEDULE_BLOCKED,
        REMOTE_LOCK,
    }

    @Volatile
    var isShowing = false
        private set

    fun show(context: Context, reason: Reason, detail: String? = null) {
        if (isShowing) {
            // Update message if already showing
            updateMessage(reason, detail)
            return
        }

        if (!Settings.canDrawOverlays(context)) {
            Log.w(TAG, "Cannot draw overlays — permission not granted")
            return
        }

        handler.post {
            try {
                // Dismiss any stale view first
                dismissImmediate()

                val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                windowManager = wm
                currentReason = reason

                val view = createOverlayView(context, reason, detail)
                overlayView = view

                val params = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                    // No FLAG_NOT_FOCUSABLE — overlay captures key events (back button)
                    // No FLAG_NOT_TOUCH_MODAL — overlay consumes ALL touch events
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                        or WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                        or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                    PixelFormat.TRANSLUCENT,
                )
                params.gravity = Gravity.CENTER

                wm.addView(view, params)
                isShowing = true
                Log.d(TAG, "Overlay shown: $reason")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to show overlay", e)
            }
        }
    }

    fun dismiss() {
        handler.post {
            dismissImmediate()
        }
    }

    private fun dismissImmediate() {
        try {
            overlayView?.let { view ->
                windowManager?.removeView(view)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to dismiss overlay", e)
        } finally {
            overlayView = null
            windowManager = null
            currentReason = null
            isShowing = false
            Log.d(TAG, "Overlay dismissed")
        }
    }

    /**
     * Re-show the overlay if it should be visible but was somehow removed.
     * Called periodically by ScreenTimeLimiter to ensure enforcement persists.
     */
    fun ensureShowing(context: Context, reason: Reason, detail: String? = null) {
        if (!isShowing) {
            show(context, reason, detail)
        }
    }

    private fun updateMessage(reason: Reason, detail: String?) {
        handler.post {
            val view = overlayView ?: return@post
            currentReason = reason
            val iconView = view.findViewWithTag<TextView>("icon")
            val titleView = view.findViewWithTag<TextView>("title")
            val msgView = view.findViewWithTag<TextView>("message")
            val detailView = view.findViewWithTag<TextView>("detail")

            iconView?.text = getIconEmoji(reason)
            titleView?.text = getTitleText(reason)
            msgView?.text = getMessageText(reason)
            detailView?.text = detail ?: ""
            detailView?.visibility = if (detail != null) View.VISIBLE else View.GONE
        }
    }

    private fun createOverlayView(context: Context, reason: Reason, detail: String?): View {
        val layout = object : LinearLayout(context) {
            override fun dispatchKeyEvent(event: KeyEvent): Boolean {
                // Consume back button and all other key events
                if (event.keyCode == KeyEvent.KEYCODE_BACK ||
                    event.keyCode == KeyEvent.KEYCODE_HOME ||
                    event.keyCode == KeyEvent.KEYCODE_APP_SWITCH
                ) {
                    return true // consumed
                }
                return true // consume everything
            }

            override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
                // Consume all touch events — nothing passes through
                return true
            }
        }.apply {
            orientation = VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#FF1E293B")) // fully opaque dark
            setPadding(64, 64, 64, 64)
            isFocusable = true
            isFocusableInTouchMode = true
        }

        // Lock icon (emoji as text — no drawable dependency)
        val iconView = TextView(context).apply {
            tag = "icon"
            text = getIconEmoji(reason)
            textSize = 48f
            gravity = Gravity.CENTER
        }
        layout.addView(iconView)

        // Title
        val titleView = TextView(context).apply {
            tag = "title"
            text = getTitleText(reason)
            textSize = 24f
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 16)
        }
        layout.addView(titleView)

        // Message
        val messageView = TextView(context).apply {
            tag = "message"
            text = getMessageText(reason)
            textSize = 16f
            setTextColor(Color.parseColor("#94A3B8"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 16)
        }
        layout.addView(messageView)

        // Detail (e.g. "Unlocks at 18:00")
        val detailView = TextView(context).apply {
            tag = "detail"
            text = detail ?: ""
            textSize = 18f
            setTextColor(Color.parseColor("#60A5FA"))
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            visibility = if (detail != null) View.VISIBLE else View.GONE
        }
        layout.addView(detailView)

        return layout
    }

    private fun getIconEmoji(reason: Reason): String = when (reason) {
        Reason.DAILY_LIMIT -> "\u23F0" // alarm clock
        Reason.APP_LIMIT -> "\u23F3" // hourglass
        Reason.SCHEDULE_BLOCKED -> "\uD83C\uDF19" // moon
        Reason.REMOTE_LOCK -> "\uD83D\uDD12" // lock
    }

    private fun getTitleText(reason: Reason): String = when (reason) {
        Reason.DAILY_LIMIT -> "Screen Time Limit Reached"
        Reason.APP_LIMIT -> "App Time Limit Reached"
        Reason.SCHEDULE_BLOCKED -> "Device Time is Over"
        Reason.REMOTE_LOCK -> "Device Locked"
    }

    private fun getMessageText(reason: Reason): String = when (reason) {
        Reason.DAILY_LIMIT -> "You've used all your screen time for today.\nCome back tomorrow!"
        Reason.APP_LIMIT -> "You've reached the time limit for this app."
        Reason.SCHEDULE_BLOCKED -> "It's time to take a break.\nThis device is blocked right now."
        Reason.REMOTE_LOCK -> "Your parent has locked this device."
    }
}
