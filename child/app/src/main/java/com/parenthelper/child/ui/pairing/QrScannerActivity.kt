package com.parenthelper.child.ui.pairing

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.parenthelper.child.R
import java.util.concurrent.Executors

class QrScannerActivity : AppCompatActivity() {

    private lateinit var previewView: PreviewView
    private lateinit var tvScanStatus: TextView
    private var codeFound = false

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startCamera()
        } else {
            Toast.makeText(this, getString(R.string.pairing_camera_permission_needed), Toast.LENGTH_LONG).show()
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_scanner)

        previewView = findViewById(R.id.previewView)
        tvScanStatus = findViewById(R.id.tvScanStatus)
        val btnClose = findViewById<ImageView>(R.id.btnClose)

        btnClose.setOnClickListener { finish() }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startCamera()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    @androidx.camera.core.ExperimentalGetImage
    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.surfaceProvider = previewView.surfaceProvider
            }

            val scanner = BarcodeScanning.getClient()
            val analysisExecutor = Executors.newSingleThreadExecutor()

            val imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            imageAnalysis.setAnalyzer(analysisExecutor) { imageProxy ->
                val mediaImage = imageProxy.image
                if (mediaImage != null && !codeFound) {
                    val inputImage = InputImage.fromMediaImage(
                        mediaImage, imageProxy.imageInfo.rotationDegrees,
                    )
                    scanner.process(inputImage)
                        .addOnSuccessListener { barcodes ->
                            for (barcode in barcodes) {
                                if (barcode.valueType == Barcode.TYPE_TEXT) {
                                    val value = barcode.rawValue ?: continue
                                    // Expect a 6-character alphanumeric code
                                    val code = value.trim().uppercase()
                                    if (code.matches(Regex("^[A-Z0-9]{6}$"))) {
                                        codeFound = true
                                        returnCode(code)
                                        return@addOnSuccessListener
                                    }
                                }
                            }
                        }
                        .addOnFailureListener { e ->
                            Log.w(TAG, "Barcode scan failed", e)
                        }
                        .addOnCompleteListener {
                            imageProxy.close()
                        }
                } else {
                    imageProxy.close()
                }
            }

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageAnalysis,
                )
            } catch (e: Exception) {
                Log.e(TAG, "Camera binding failed", e)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun returnCode(code: String) {
        val resultIntent = Intent().apply {
            putExtra(EXTRA_PAIRING_CODE, code)
        }
        setResult(RESULT_OK, resultIntent)
        finish()
    }

    companion object {
        private const val TAG = "QrScanner"
        const val EXTRA_PAIRING_CODE = "pairing_code"
    }
}
