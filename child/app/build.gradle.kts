import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.google.services)
    alias(libs.plugins.firebase.crashlytics)
}

// Load .env file for build configuration
val envFile = rootProject.file(".env")
val envProps = Properties().apply {
    if (envFile.exists()) {
        envFile.reader().use { reader ->
            reader.readLines().forEach { line ->
                val trimmed = line.trim()
                if (trimmed.isNotEmpty() && !trimmed.startsWith("#") && trimmed.contains("=")) {
                    val (key, value) = trimmed.split("=", limit = 2)
                    setProperty(key.trim(), value.trim())
                }
            }
        }
    }
}

// Load release signing config from keystore.properties (gitignored — never committed)
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) {
        keystorePropsFile.inputStream().use { load(it) }
    }
}

android {
    namespace = "com.parenthelper.child"
    compileSdk = 35

    kotlinOptions {
        jvmTarget = "17"
    }

    defaultConfig {
        applicationId = "com.parenthelper.child"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField(
            "String",
            "SERVER_URL",
            "\"${envProps.getProperty("SERVER_URL", "http://139.59.107.13/parent-helper/")}\""
        )
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        if (keystorePropsFile.exists()) {
            create("release") {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            if (keystorePropsFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // AndroidX
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)

    // Coroutines
    implementation(libs.coroutines.core)
    implementation(libs.coroutines.android)

    // Lifecycle
    implementation(libs.lifecycle.runtime)
    implementation(libs.lifecycle.viewmodel)
    implementation(libs.lifecycle.service)

    // WorkManager
    implementation(libs.workmanager)

    // DataStore
    implementation(libs.datastore)

    // Location
    implementation(libs.play.services.location)

    // Serialization
    implementation(libs.kotlinx.serialization)

    // Socket.IO
    implementation(libs.socketio.client)

    // ML Kit Barcode Scanning (QR code pairing)
    implementation(libs.mlkit.barcode)

    // Firebase Crashlytics
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.crashlytics)
    implementation(libs.firebase.analytics)

    // CameraX (for QR scanner)
    implementation("androidx.camera:camera-core:1.4.1")
    implementation("androidx.camera:camera-camera2:1.4.1")
    implementation("androidx.camera:camera-lifecycle:1.4.1")
    implementation("androidx.camera:camera-view:1.4.1")

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
