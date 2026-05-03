package com.parenthelper.child.ui.pairing

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.parenthelper.child.BuildConfig
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.R
import com.parenthelper.child.data.api.ApiClient
import com.parenthelper.child.data.models.PairingRequest
import com.parenthelper.child.ui.main.MainActivity
import com.parenthelper.child.ui.onboarding.PairingSuccessActivity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.HttpException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

class PairingActivity : AppCompatActivity() {

    private lateinit var boxes: List<EditText>
    private lateinit var btnPair: MaterialButton
    private lateinit var progressBar: ProgressBar
    private lateinit var tvError: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pairing)

        boxes = listOf(
            findViewById(R.id.box1),
            findViewById(R.id.box2),
            findViewById(R.id.box3),
            findViewById(R.id.box4),
            findViewById(R.id.box5),
            findViewById(R.id.box6),
            findViewById(R.id.box7),
            findViewById(R.id.box8),
        )
        btnPair = findViewById(R.id.btnPair)
        progressBar = findViewById(R.id.progressBar)
        tvError = findViewById(R.id.tvError)

        setupBoxListeners()
        btnPair.setOnClickListener { attemptPairing() }

        // Auto-focus first box and show keyboard
        boxes[0].postDelayed({
            boxes[0].requestFocus()
            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showSoftInput(boxes[0], InputMethodManager.SHOW_IMPLICIT)
        }, 150)

        // Skip to main if already paired
        lifecycleScope.launch {
            val paired = (application as ParentHelperApp).prefsManager.isPaired.first()
            if (paired) {
                startActivity(Intent(this@PairingActivity, MainActivity::class.java))
                finish()
            }
        }
    }

    private fun setupBoxListeners() {
        boxes.forEachIndexed { index, box ->
            box.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    val text = s?.toString() ?: return
                    if (text.length == 1) {
                        // Advance to next box
                        if (index < boxes.lastIndex) {
                            boxes[index + 1].requestFocus()
                        } else {
                            // Last box filled — hide keyboard and attempt pairing
                            box.clearFocus()
                            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
                            imm.hideSoftInputFromWindow(box.windowToken, 0)
                            if (getCode().length == PAIRING_CODE_LENGTH) attemptPairing()
                        }
                    }
                    tvError.visibility = View.GONE
                }
            })

            // Handle backspace to go to previous box
            box.setOnKeyListener { _, keyCode, event ->
                if (keyCode == KeyEvent.KEYCODE_DEL && event.action == KeyEvent.ACTION_DOWN) {
                    if (box.text.isEmpty() && index > 0) {
                        boxes[index - 1].apply {
                            requestFocus()
                            text.clear()
                        }
                        return@setOnKeyListener true
                    }
                }
                false
            }

            // When box is tapped, clear it so user can retype
            box.setOnClickListener {
                box.text.clear()
            }
        }
    }

    private fun getCode(): String = boxes.joinToString("") { it.text.toString().trim().uppercase() }

    private fun attemptPairing() {
        val code = getCode()
        if (code.length < PAIRING_CODE_LENGTH) {
            showError(getString(R.string.pairing_error_empty))
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            val serverUrl = BuildConfig.SERVER_URL
            val url = if (serverUrl.endsWith("/")) serverUrl else "$serverUrl/"
            val fullEndpoint = "${url}devices/complete-pairing"
            Log.d(TAG, "Pairing attempt: code=$code, endpoint=$fullEndpoint")

            try {
                (application as ParentHelperApp).prefsManager.saveBaseUrl(url)
                ApiClient.init(url, (application as ParentHelperApp).prefsManager)

                val request = PairingRequest(
                    pairingCode = code,
                    platform = "android",
                    model = "${Build.MANUFACTURER} ${Build.MODEL}",
                    osVersion = Build.VERSION.RELEASE,
                    appVersion = BuildConfig.VERSION_NAME,
                )
                Log.d(TAG, "Sending PairingRequest: $request")

                val response = ApiClient.service.completePairing(request)
                Log.d(TAG, "Pairing succeeded: deviceId=${response.deviceId}")

                (application as ParentHelperApp).prefsManager.savePairingData(
                    deviceToken = response.deviceToken,
                    deviceId = response.deviceId,
                    childId = response.childId,
                    parentId = response.parentId,
                )

                // Set crash reporting context with device identity
                (application as ParentHelperApp).setCrashlyticsUser(
                    response.deviceId,
                    null
                )

                // Navigate to pairing success screen (part of onboarding flow)
                startActivity(Intent(this@PairingActivity, PairingSuccessActivity::class.java))
                finish()
            } catch (e: HttpException) {
                val body = try { e.response()?.errorBody()?.string() } catch (_: Exception) { null }
                val parsedError = try { body?.let { JSONObject(it).optString("error") } } catch (_: Exception) { null }
                Log.e(TAG, "HttpException ${e.code()}: body=$body", e)
                showErrorDialog(
                    title = "Server returned error ${e.code()}",
                    detail = "Endpoint: $fullEndpoint\nResponse: ${parsedError ?: body ?: "(empty body)"}",
                )
            } catch (e: ConnectException) {
                Log.e(TAG, "ConnectException to $fullEndpoint", e)
                showErrorDialog(
                    title = "Cannot connect to server",
                    detail = "Endpoint: $fullEndpoint\n${e.javaClass.simpleName}: ${e.message ?: "(no message)"}\nCheck phone has internet and the URL is reachable.",
                )
            } catch (e: UnknownHostException) {
                Log.e(TAG, "UnknownHostException for $fullEndpoint", e)
                showErrorDialog(
                    title = "DNS lookup failed",
                    detail = "Endpoint: $fullEndpoint\n${e.javaClass.simpleName}: ${e.message ?: "(no message)"}",
                )
            } catch (e: SocketTimeoutException) {
                Log.e(TAG, "SocketTimeoutException for $fullEndpoint", e)
                showErrorDialog(
                    title = "Connection timed out",
                    detail = "Endpoint: $fullEndpoint\nServer didn't respond within 30 seconds.",
                )
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected pairing error", e)
                showErrorDialog(
                    title = "Pairing failed",
                    detail = "Endpoint: $fullEndpoint\n${e.javaClass.simpleName}: ${e.message ?: "(no message)"}",
                )
            } finally {
                setLoading(false)
            }
        }
    }

    private fun showErrorDialog(title: String, detail: String) {
        if (isFinishing || isDestroyed) return
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(detail)
            .setPositiveButton("OK", null)
            .show()
        // Also keep the inline error visible for context
        tvError.text = title
        tvError.visibility = View.VISIBLE
        boxes.forEach { it.text.clear() }
        boxes[0].requestFocus()
    }

    private fun setLoading(loading: Boolean) {
        btnPair.isEnabled = !loading
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        tvError.visibility = View.GONE
    }

    private fun showError(message: String) {
        tvError.text = message
        tvError.visibility = View.VISIBLE
        // Shake boxes to indicate error — clear them so user can retry
        boxes.forEach { it.text.clear() }
        boxes[0].requestFocus()
    }

    companion object {
        private const val PAIRING_CODE_LENGTH = 8
        private const val TAG = "PairingActivity"
    }
}
