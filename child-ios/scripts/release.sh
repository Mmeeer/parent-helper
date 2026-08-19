#!/usr/bin/env bash
# Archive → export (App Store) → upload to App Store Connect, headless (no Xcode login).
# Requires: Admin-role ASC API key at ../AuthKey_44VPNY6FPV.p8 (git-ignored) and the App Store Connect
# API issuer below. Bump MARKETING_VERSION / CURRENT_PROJECT_VERSION in Config/Shared.xcconfig first.
# Usage: scripts/release.sh [--no-upload]
set -euo pipefail
cd "$(dirname "$0")/.."
KEY_ID=${ASC_KEY_ID:-44VPNY6FPV}
ISSUER=${ASC_ISSUER_ID:-70a1985a-c2f0-475c-a86c-5c2ee5bdc7e4}
KEY_PATH=${ASC_KEY_PATH:-../AuthKey_${KEY_ID}.p8}
AUTH=(-allowProvisioningUpdates -authenticationKeyPath "$KEY_PATH" -authenticationKeyID "$KEY_ID" -authenticationKeyIssuerID "$ISSUER")
xcodegen generate >/dev/null
rm -rf build/PrimeKidsChild.xcarchive build/export
xcodebuild archive -project PrimeKidsChild.xcodeproj -scheme PrimeKidsChild -destination 'generic/platform=iOS' \
  -archivePath build/PrimeKidsChild.xcarchive -derivedDataPath build/DerivedData "${AUTH[@]}" | grep -E '\*\* ARCHIVE|error:' || true
sed 's#<string>upload</string>#<string>export</string>#' ExportOptions.plist > build/ExportOptions-export.plist
xcodebuild -exportArchive -archivePath build/PrimeKidsChild.xcarchive -exportOptionsPlist build/ExportOptions-export.plist \
  -exportPath build/export "${AUTH[@]}" | grep -E '\*\* EXPORT|error' || true
ls -la build/export/PrimeKidsChild.ipa
if [ "${1:-}" != "--no-upload" ]; then
  mkdir -p ~/.private_keys && cp "$KEY_PATH" ~/.private_keys/ 2>/dev/null || true
  xcrun altool --upload-app -f build/export/PrimeKidsChild.ipa -t ios --apiKey "$KEY_ID" --apiIssuer "$ISSUER" | grep -E 'UPLOAD|error|Delivery UUID' || true
fi
