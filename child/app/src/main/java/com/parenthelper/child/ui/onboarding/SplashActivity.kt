package com.parenthelper.child.ui.onboarding

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.R
import com.parenthelper.child.ui.main.MainActivity
import com.parenthelper.child.ui.pairing.PairingActivity
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val icon = findViewById<ImageView>(R.id.ivSplashIcon)
        val title = findViewById<TextView>(R.id.tvSplashTitle)
        val subtitle = findViewById<TextView>(R.id.tvSplashSubtitle)

        // Animate in: icon first, then title, then subtitle
        val iconFadeIn = ObjectAnimator.ofFloat(icon, View.ALPHA, 0f, 1f).setDuration(500)
        val iconScaleX = ObjectAnimator.ofFloat(icon, View.SCALE_X, 0.5f, 1f).setDuration(500)
        val iconScaleY = ObjectAnimator.ofFloat(icon, View.SCALE_Y, 0.5f, 1f).setDuration(500)

        val titleFadeIn = ObjectAnimator.ofFloat(title, View.ALPHA, 0f, 1f).setDuration(400)
        val titleSlideUp = ObjectAnimator.ofFloat(title, View.TRANSLATION_Y, 20f, 0f).setDuration(400)

        val subtitleFadeIn = ObjectAnimator.ofFloat(subtitle, View.ALPHA, 0f, 1f).setDuration(400)
        val subtitleSlideUp = ObjectAnimator.ofFloat(subtitle, View.TRANSLATION_Y, 20f, 0f).setDuration(400)

        val animatorSet = AnimatorSet()
        animatorSet.interpolator = DecelerateInterpolator()

        val iconAnim = AnimatorSet().apply { playTogether(iconFadeIn, iconScaleX, iconScaleY) }
        val titleAnim = AnimatorSet().apply { playTogether(titleFadeIn, titleSlideUp) }
        val subtitleAnim = AnimatorSet().apply { playTogether(subtitleFadeIn, subtitleSlideUp) }

        animatorSet.playSequentially(iconAnim, titleAnim, subtitleAnim)
        animatorSet.start()

        lifecycleScope.launch {
            delay(2000)
            navigateNext()
        }
    }

    private suspend fun navigateNext() {
        val paired = (application as ParentHelperApp).prefsManager.isPaired.first()
        val target = if (paired) {
            MainActivity::class.java
        } else {
            PairingActivity::class.java
        }
        startActivity(Intent(this@SplashActivity, target))
        finish()
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }
}
