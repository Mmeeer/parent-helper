# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Preserve line number information for debugging stack traces (required for Crashlytics).
-keepattributes SourceFile,LineNumberTable

# Hide the original source file name in stack traces.
-renamesourcefileattribute SourceFile

# ── Gson + Retrofit JSON models ───────────────────────────────────────────────
# R8 obfuscation renames data-class field names; Gson (de)serializes by reflecting
# on those names, and our wire models carry NO @SerializedName fallbacks. In a
# minified release this made the app send {"a":"PRIME888",...} instead of
# {"pairingCode":"PRIME888",...}, so the backend rejected pairing with
# 400 "Pairing code is required". Keeping the model field names intact fixes it.
-keep class com.parenthelper.child.data.models.** { <fields>; }

# Standard Gson consumer rules.
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}
# Keep generic TypeToken signatures (Gson reflective type resolution).
-keep,allowobfuscation,allowshrinking class com.google.gson.reflect.TypeToken
-keep,allowobfuscation,allowshrinking class * extends com.google.gson.reflect.TypeToken