#!/usr/bin/env bash
# Capture App Store screenshots of the child app from the iOS Simulator (6.9" = 1320x2868), EN + MN.
# Uses the DEBUG-only launch hooks in PrimeKidsChildApp.swift (-pkDemo, -pkScene, -pkStep).
set -euo pipefail
SIM_NAME="iPhone 17 Pro Max"
SIM=$(xcrun simctl list devices available | grep "$SIM_NAME (" | head -1 | grep -oE '[0-9A-F-]{36}')
APP=build/DerivedData/Build/Products/Debug-iphonesimulator/PrimeKidsChild.app
xcodebuild build -project PrimeKidsChild.xcodeproj -scheme PrimeKidsChild -destination "platform=iOS Simulator,name=$SIM_NAME" -derivedDataPath build/DerivedData | grep -E '\*\* BUILD' || true
xcrun simctl boot "$SIM" 2>/dev/null || true; xcrun simctl bootstatus "$SIM" -b >/dev/null
xcrun simctl status_bar "$SIM" override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4 --operatorName ""
xcrun simctl install "$SIM" "$APP"
cap() { # dir name args...
  local dir=$1 name=$2; shift 2
  xcrun simctl launch "$SIM" com.parenthelper.child -pkDemo "$@" >/dev/null; sleep 5
  xcrun simctl io "$SIM" screenshot "store-assets/screenshots/$dir/$name.png" >/dev/null && echo "captured $dir/$name"
  xcrun simctl terminate "$SIM" com.parenthelper.child 2>/dev/null || true; sleep 1
}
for L in en mn; do
  if [ $L = en ]; then D=iphone-6.9; A=(); else D=iphone-6.9-mn; A=(-AppleLanguages "(mn)" -AppleLocale mn_MN); fi
  mkdir -p "store-assets/screenshots/$D"
  cap $D 01-pairing -pkScene pairing "${A[@]}"
  cap $D 02-onboarding-location -pkScene onboarding -pkStep 1 "${A[@]}"
  cap $D 03-dashboard "${A[@]}"
  cap $D 04-settings -pkScene settings "${A[@]}"
  cap $D 05-parent-settings -pkScene parent "${A[@]}"
done
xcrun simctl status_bar "$SIM" clear
echo done
