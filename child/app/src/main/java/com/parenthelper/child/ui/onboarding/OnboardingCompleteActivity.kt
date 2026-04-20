package com.parenthelper.child.ui.onboarding

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.parenthelper.child.R
import com.parenthelper.child.services.MonitoringService
import com.parenthelper.child.ui.main.MainActivity

class OnboardingCompleteActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_onboarding_complete)

        val icon = findViewById<ImageView>(R.id.ivCompleteIcon)
        val title = findViewById<TextView>(R.id.tvCompleteTitle)
        val description = findViewById<TextView>(R.id.tvCompleteDescription)
        val monitoringChip = findViewById<TextView>(R.id.tvMonitoringChip)
        val btnFinish = findViewById<MaterialButton>(R.id.btnFinish)

        // Start monitoring service immediately
        val serviceIntent = Intent(this, MonitoringService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent)

        btnFinish.setOnClickListener {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }

        // Animate elements in
        val iconScale = AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(icon, View.ALPHA, 0f, 1f).setDuration(400),
                ObjectAnimator.ofFloat(icon, View.SCALE_X, 0f, 1f).setDuration(500),
                ObjectAnimator.ofFloat(icon, View.SCALE_Y, 0f, 1f).setDuration(500),
            )
            interpolator = OvershootInterpolator(1.5f)
        }

        val titleAnim = AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(title, View.ALPHA, 0f, 1f).setDuration(400),
                ObjectAnimator.ofFloat(title, View.TRANSLATION_Y, 30f, 0f).setDuration(400),
            )
        }

        val descAnim = AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(description, View.ALPHA, 0f, 1f).setDuration(400),
                ObjectAnimator.ofFloat(description, View.TRANSLATION_Y, 20f, 0f).setDuration(400),
            )
        }

        val chipAnim = ObjectAnimator.ofFloat(monitoringChip, View.ALPHA, 0f, 1f).setDuration(400)
        val btnAnim = ObjectAnimator.ofFloat(btnFinish, View.ALPHA, 0f, 1f).setDuration(400)

        AnimatorSet().apply {
            interpolator = DecelerateInterpolator()
            playSequentially(iconScale, titleAnim, descAnim, chipAnim, btnAnim)
            startDelay = 200
            start()
        }
    }
}
