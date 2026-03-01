package com.parenthelper.child.ui.pairing

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.parenthelper.child.BuildConfig
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.R
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.PairingRequest
import com.parenthelper.child.ui.main.MainActivity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.HttpException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

class PairingActivity : AppCompatActivity() {

    private lateinit var etPairingCode: TextInputEditText
    private lateinit var etServerUrl: TextInputEditText
    private lateinit var btnPair: MaterialButton
    private lateinit var progressBar: ProgressBar
    private lateinit var tvError: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pairing)

        etPairingCode = findViewById(R.id.etPairingCode)
        etServerUrl = findViewById(R.id.etServerUrl)
        btnPair = findViewById(R.id.btnPair)
        progressBar = findViewById(R.id.progressBar)
        tvError = findViewById(R.id.tvError)

        // Pre-populate server URL from BuildConfig (sourced from .env)
        etServerUrl.setText(BuildConfig.SERVER_URL)

        btnPair.setOnClickListener { attemptPairing() }

        // If already paired, skip to main
        lifecycleScope.launch {
            val paired = (application as ParentHelperApp).prefsManager.isPaired.first()
            if (paired) {
                startActivity(Intent(this@PairingActivity, MainActivity::class.java))
                finish()
            }
        }
    }

    private fun attemptPairing() {
        val code = etPairingCode.text?.toString()?.trim()?.uppercase()
        if (code.isNullOrEmpty()) {
            showError(getString(R.string.pairing_error_empty))
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            try {
                // Use server URL from the input field, falling back to BuildConfig value
                val serverUrl = etServerUrl.text?.toString()?.trim()
                    .takeIf { !it.isNullOrEmpty() } ?: BuildConfig.SERVER_URL
                val url = if (serverUrl.endsWith("/")) serverUrl else "$serverUrl/"
                (application as ParentHelperApp).prefsManager.saveBaseUrl(url)
                ApiClient.init(url, (application as ParentHelperApp).prefsManager)

                val request = PairingRequest(
                    pairingCode = code,
                    platform = "android",
                    model = "${Build.MANUFACTURER} ${Build.MODEL}",
                    osVersion = Build.VERSION.RELEASE,
                    appVersion = BuildConfig.VERSION_NAME,
                )

                val response = ApiClient.service.completePairing(request)

                (application as ParentHelperApp).prefsManager.savePairingData(
                    deviceToken = response.deviceToken,
                    deviceId = response.deviceId,
                    childId = response.childId,
                    parentId = response.parentId,
                )

                startActivity(Intent(this@PairingActivity, MainActivity::class.java))
                finish()
            } catch (e: HttpException) {
                val errorMsg = try {
                    val body = e.response()?.errorBody()?.string()
                    body?.let { JSONObject(it).optString("error") }
                } catch (_: Exception) { null }
                showError(errorMsg ?: getString(R.string.pairing_error_failed))
            } catch (e: ConnectException) {
                showError("Cannot connect to server. Check the server URL and ensure the server is running.")
            } catch (e: UnknownHostException) {
                showError("Server not found. Check the server URL.")
            } catch (e: SocketTimeoutException) {
                showError("Connection timed out. Check your network and server URL.")
            } catch (e: Exception) {
                showError(e.message ?: getString(R.string.pairing_error_failed))
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        btnPair.isEnabled = !loading
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        tvError.visibility = View.GONE
    }

    private fun showError(message: String) {
        tvError.text = message
        tvError.visibility = View.VISIBLE
    }
}
