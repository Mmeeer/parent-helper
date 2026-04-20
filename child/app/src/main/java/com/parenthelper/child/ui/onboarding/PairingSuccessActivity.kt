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
import com.google.android.material.button.MaterialButton
import com.parenthelper.child.R

class PairingSuccessActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pairing_success)

        val icon = findViewById<ImageView>(R.id.ivSuccessIcon)
        val title = findViewById<TextView>(R.id.tvSuccessTitle)
        val description = findViewById<TextView>(R.id.tvSuccessDescription)
        val btnContinue = findViewById<MaterialButton>(R.id.btnContinue)

        btnContinue.setOnClickListener {
            startActivity(Intent(this, OnboardingPermissionsActivity::class.java))
            finish()
        }

        // Animate elements in sequence
        val iconFade = ObjectAnimator.ofFloat(icon, View.ALPHA, 0f, 1f).setDuration(400)
        val iconScale = AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(icon, View.SCALE_X, 0f, 1f).setDuration(500),
                ObjectAnimator.ofFloat(icon, View.SCALE_Y, 0f, 1f).setDuration(500),
                iconFade,
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

        val btnAnim = ObjectAnimator.ofFloat(btnContinue, View.ALPHA, 0f, 1f).setDuration(400)

        AnimatorSet().apply {
            interpolator = DecelerateInterpolator()
            playSequentially(iconScale, titleAnim, descAnim, btnAnim)
            startDelay = 200
            start()
        }
    }
}
