# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ------------------------------------------------------------------
# React Native (core)
# ------------------------------------------------------------------
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip
-keep,allowobfuscation @interface com.facebook.jni.annotations.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
    @com.facebook.jni.annotations.DoNotStrip *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

-dontwarn com.facebook.react.**
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.turbomodule.core.** { *; }

# Classes Fabric's C++ looks up BY NAME over JNI (fbjni `kJavaDescriptor`).
# Their methods carry @DoNotStrip, but the CLASSES don't, so R8 renamed
# them — e.g. ReactModalHostView → `views.modal.d` — and every core
# <Modal> (date pickers, chart fullscreen…) crashed the release build
# with "ClassNotFoundException: …ReactModalHostView". Audited against
# mapping.txt: these were the only renamed JNI-referenced classes in
# app code paths (TaskInterface is dev-inspector-only, kept for safety).
-keep class com.facebook.react.views.modal.ReactModalHostView { *; }
-keep class com.facebook.react.interfaces.TaskInterface { *; }

# ------------------------------------------------------------------
# Hermes
# ------------------------------------------------------------------
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ------------------------------------------------------------------
# react-native-reanimated
# ------------------------------------------------------------------
-keep class com.swmansion.reanimated.** { *; }
-keep class dev.reactnativecommunity.** { *; }

# ------------------------------------------------------------------
# react-native-svg
# ------------------------------------------------------------------
-keep public class com.horcrux.svg.** { *; }

# ------------------------------------------------------------------
# Fresco / animated-gif / animated-webp
# ------------------------------------------------------------------
-keep,allowobfuscation @interface com.facebook.soloader.DoNotOptimize
-keep @com.facebook.soloader.DoNotOptimize class *
-keepclassmembers class * { @com.facebook.soloader.DoNotOptimize *; }
-keep class com.facebook.imagepipeline.animated.** { *; }
-keep class com.facebook.animated.gif.** { *; }
-keep class com.facebook.animated.webp.** { *; }
-keep class com.facebook.fresco.** { *; }
-dontwarn com.facebook.imagepipeline.**
-dontwarn com.facebook.infer.**

# ------------------------------------------------------------------
# OkHttp / Okio
# ------------------------------------------------------------------
-keepattributes Signature
-keepattributes *Annotation*
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ------------------------------------------------------------------
# AWS Amplify / AWS SDK (com.amazonaws + com.amplifyframework)
# ------------------------------------------------------------------
-keep class com.amazonaws.** { *; }
-keep class com.amplifyframework.** { *; }
-dontwarn com.amazonaws.**
-dontwarn com.amplifyframework.**
-dontnote com.amazonaws.**

# ------------------------------------------------------------------
# react-native-webview
# ------------------------------------------------------------------
-keep public class com.reactnativecommunity.webview.** { *; }
-dontwarn com.reactnativecommunity.webview.**

# ------------------------------------------------------------------
# react-native-vector-icons
# ------------------------------------------------------------------
-keep class com.oblador.vectoricons.** { *; }

# ------------------------------------------------------------------
# Lottie (lottie-react-native / lottie-android)
# ------------------------------------------------------------------
-keep class com.airbnb.lottie.** { *; }
-dontwarn com.airbnb.lottie.**
