#!/usr/bin/env bash
# Capture App Store screenshots of the parent app from the iOS Simulator (6.9" = 1320x2868).
# Prereqs: `npm install`, `npx expo prebuild --platform ios`, `cd ios && pod install`, and a Debug
# simulator build (see below). Uses the dev-only demo hooks in src/utils/demoHooks.ts.
# Usage:  scripts/ios-screenshots.sh [en|mn]
set -euo pipefail
LANGV=${1:-en}
SIM_NAME="iPhone 17 Pro Max"
SIM=$(xcrun simctl list devices available | grep "$SIM_NAME (" | head -1 | grep -oE '[0-9A-F-]{36}')
APP=ios/build/DerivedData/Build/Products/Debug-iphonesimulator/PrimeKidsParentHelper.app
OUT=store-assets/screenshots/iphone-6.9$([ "$LANGV" = mn ] && echo -mn || true)
: "${REVIEW_PASSWORD:=ReviewTest2026!}"
mkdir -p "$OUT"
[ -d "$APP" ] || (cd ios && xcodebuild build -workspace PrimeKidsParentHelper.xcworkspace -scheme PrimeKidsParentHelper -configuration Debug -destination "platform=iOS Simulator,name=$SIM_NAME" -derivedDataPath build/DerivedData | tail -1)
xcrun simctl boot "$SIM" 2>/dev/null || true; xcrun simctl bootstatus "$SIM" -b >/dev/null
xcrun simctl status_bar "$SIM" override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4 --operatorName ""
xcrun simctl uninstall "$SIM" com.parenthelper.parent 2>/dev/null || true
xcrun simctl install "$SIM" "$APP"
LARGS=(); [ "$LANGV" = mn ] && LARGS=(-AppleLanguages "(mn)" -AppleLocale mn_MN)
cap() { # name screen
  pkill -f 'expo start' 2>/dev/null || true; sleep 1
  (EXPO_PUBLIC_DEMO_LOGIN=1 EXPO_PUBLIC_DEMO_PASSWORD="$REVIEW_PASSWORD" EXPO_PUBLIC_DEMO_SCREEN="$2" npx expo start --dev-client --port 8081 > /tmp/metro-shots.log 2>&1 &)
  until curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/status 2>/dev/null | grep -q 200; do sleep 2; done
  xcrun simctl terminate "$SIM" com.parenthelper.parent 2>/dev/null || true; sleep 1
  xcrun simctl launch "$SIM" com.parenthelper.parent "${LARGS[@]}" >/dev/null; sleep 35
  xcrun simctl io "$SIM" screenshot "$OUT/$1.png" >/dev/null && echo "captured $OUT/$1.png"
}
cap 01-dashboard   "MainTabs:Dashboard"
cap 02-location    "LocationMap"
cap 03-alerts      "MainTabs:Alerts"
cap 04-screen-time "ScreenTimeRules"
cap 05-reports     "Reports"
cap 06-web-filter  "WebFilter"
cap 07-geofences   "Geofences"
pkill -f 'expo start' 2>/dev/null || true
xcrun simctl status_bar "$SIM" clear
echo "done → $OUT"
