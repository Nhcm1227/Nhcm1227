#!/usr/bin/env python3
"""Cấu hình thư mục android/ và ios/ sau khi chạy `flutter create`.

Chạy được nhiều lần (không thêm trùng). Nếu một bước không tìm thấy chỗ cần
sửa, script in cảnh báo để bạn sửa tay theo README.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
warnings = []


def patch(path: pathlib.Path, fn, label: str):
    if not path.exists():
        warnings.append(f"Không thấy {path.relative_to(ROOT)} ({label})")
        return
    old = path.read_text(encoding="utf-8")
    new = fn(old)
    if new is None:
        warnings.append(f"Không sửa được {path.relative_to(ROOT)} ({label}) — hãy sửa tay")
        return
    if new != old:
        path.write_text(new, encoding="utf-8")
        print(f"✔ {label}: {path.relative_to(ROOT)}")
    else:
        print(f"• {label}: đã cấu hình sẵn")


# --------------------------------------------------------------------------- Android

ANDROID_PERMS = """    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
"""

ANDROID_RECEIVERS = """        <receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver" />
        <receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED"/>
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON"/>
            </intent-filter>
        </receiver>
"""


def manifest(s: str):
    if "ScheduledNotificationReceiver" in s:
        return s
    m = re.search(r"<manifest[^>]*>\s*\n", s)
    if not m or "</application>" not in s:
        return None
    s = s[: m.end()] + ANDROID_PERMS + s[m.end():]
    s = s.replace("</application>", ANDROID_RECEIVERS + "    </application>", 1)
    s = s.replace('android:label="fridge_keeper"', 'android:label="Tủ lạnh"')
    return s


def gradle_kts(s: str):
    if "isCoreLibraryDesugaringEnabled" not in s:
        if "compileOptions {" not in s:
            return None
        s = s.replace("compileOptions {",
                      "compileOptions {\n        isCoreLibraryDesugaringEnabled = true", 1)
    s = s.replace("minSdk = flutter.minSdkVersion",
                  "minSdk = maxOf(flutter.minSdkVersion, 21)")
    if "desugar_jdk_libs" not in s:
        s = s.rstrip() + ('\n\ndependencies {\n'
                          '    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")\n'
                          '}\n')
    return s


def gradle_groovy(s: str):
    if "coreLibraryDesugaringEnabled" not in s:
        if "compileOptions {" not in s:
            return None
        s = s.replace("compileOptions {",
                      "compileOptions {\n        coreLibraryDesugaringEnabled true", 1)
    s = re.sub(r"minSdk(Version)?\s*=?\s*flutter\.minSdkVersion", "minSdkVersion 21", s)
    if "desugar_jdk_libs" not in s:
        s = s.rstrip() + ("\n\ndependencies {\n"
                          "    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'\n"
                          "}\n")
    return s


PROGUARD_RULES = """# ML Kit text recognition tham chiếu các gói ngôn ngữ không dùng tới.
-dontwarn com.google.mlkit.vision.text.chinese.**
-dontwarn com.google.mlkit.vision.text.devanagari.**
-dontwarn com.google.mlkit.vision.text.japanese.**
-dontwarn com.google.mlkit.vision.text.korean.**
"""


def proguard(path: pathlib.Path):
    """Flutter tự nạp android/app/proguard-rules.pro khi build release."""
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    if "com.google.mlkit.vision.text.chinese" in old:
        print("• Android ProGuard rules: đã cấu hình sẵn")
        return
    path.write_text(old + ("\n" if old and not old.endswith("\n") else "") + PROGUARD_RULES,
                    encoding="utf-8")
    print(f"✔ Android ProGuard rules: {path.relative_to(ROOT)}")


# --------------------------------------------------------------------------- iOS

IOS_MIN = "15.5"  # Google ML Kit yêu cầu iOS 15.5+

PLIST_KEYS = {
    "NSCameraUsageDescription":
        "Ứng dụng dùng camera để chụp đồ ăn và hạn sử dụng in trên bao bì.",
    "NSPhotoLibraryUsageDescription":
        "Ứng dụng cần truy cập ảnh để chọn ảnh đồ ăn hoặc hạn sử dụng.",
}


def info_plist(s: str):
    add = ""
    for k, v in PLIST_KEYS.items():
        if f"<key>{k}</key>" not in s:
            add += f"\t<key>{k}</key>\n\t<string>{v}</string>\n"
    s = re.sub(r"(<key>CFBundleDisplayName</key>\s*<string>)[^<]*(</string>)",
               r"\1Tủ lạnh\2", s)
    if not add:
        return s
    idx = s.rfind("</dict>")
    if idx < 0:
        return None
    return s[:idx] + add + s[idx:]


def podfile(s: str):
    if re.search(rf"^platform :ios, '{re.escape(IOS_MIN)}'", s, re.M):
        return s
    new, n = re.subn(r"^#?\s*platform :ios, '[\d.]+'", f"platform :ios, '{IOS_MIN}'", s,
                     flags=re.M)
    if n == 0:
        new = f"platform :ios, '{IOS_MIN}'\n" + s
    return new


def pbxproj(s: str):
    def repl(m):
        ver = tuple(int(x) for x in m.group(1).split("."))
        target = tuple(int(x) for x in IOS_MIN.split("."))
        return f"IPHONEOS_DEPLOYMENT_TARGET = {IOS_MIN};" if ver < target else m.group(0)

    return re.sub(r"IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+);", repl, s)


APPDELEGATE_LINE = (
    "    UNUserNotificationCenter.current().delegate = "
    "self as? UNUserNotificationCenterDelegate\n"
)


def app_delegate(s: str):
    if "UNUserNotificationCenter.current().delegate" in s:
        return s
    idx = s.find("return super.application(")
    if idx < 0:
        return None
    line_start = s.rfind("\n", 0, idx) + 1
    s = s[:line_start] + APPDELEGATE_LINE + s[line_start:]
    if "import UserNotifications" not in s:
        s = s.replace("import UIKit", "import UIKit\nimport UserNotifications", 1)
    return s


def main():
    android = ROOT / "android" / "app"
    ios = ROOT / "ios"
    if not android.exists() and not ios.exists():
        print("Chưa có thư mục android/ hoặc ios/. Hãy chạy trước:\n"
              "  flutter create --platforms=android,ios --org com.example .")
        sys.exit(1)

    patch(android / "src" / "main" / "AndroidManifest.xml", manifest, "Android quyền + receiver thông báo")
    if android.exists():
        proguard(android / "proguard-rules.pro")
    kts = android / "build.gradle.kts"
    if kts.exists():
        patch(kts, gradle_kts, "Android desugaring + minSdk")
    else:
        patch(android / "build.gradle", gradle_groovy, "Android desugaring + minSdk")

    patch(ios / "Runner" / "Info.plist", info_plist, "iOS quyền camera/ảnh")
    patch(ios / "Podfile", podfile, f"iOS Podfile platform {IOS_MIN}")
    patch(ios / "Runner.xcodeproj" / "project.pbxproj", pbxproj, f"iOS deployment target {IOS_MIN}")
    patch(ios / "Runner" / "AppDelegate.swift", app_delegate, "iOS hiện thông báo khi đang mở app")

    if warnings:
        print("\n⚠️  Cần kiểm tra tay:")
        for w in warnings:
            print("   -", w)
    else:
        print("\nXong! Chạy: flutter pub get && flutter run")


if __name__ == "__main__":
    main()
