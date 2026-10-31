#!/usr/bin/env bash
# Builds a signed Release APK for SayHola Android App on Linux/macOS/Git Bash.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
PROPERTIES_FILE="$ANDROID_DIR/keystore.properties"

echo "=========================================================="
echo "  SayHola - Automated Signed Release APK Builder          "
echo "=========================================================="
echo ""

if [ ! -f "$PROPERTIES_FILE" ]; then
    echo "[WARNING] 'android/keystore.properties' not found!"
    read -p "Would you like to generate a new release keystore now? (Y/n): " answer
    if [ "$answer" != "n" ] && [ "$answer" != "N" ]; then
        "$SCRIPT_DIR/create-keystore.sh"
    else
        echo "Please create android/keystore.properties before building."
        exit 1
    fi
fi

echo "Step 1/3: Building web application..."
cd "$PROJECT_ROOT"
npm run build

echo ""
echo "Step 2/3: Syncing into Android project..."
npx cap sync android

echo ""
echo "Step 3/3: Running Gradle assembleRelease..."
cd "$ANDROID_DIR"
./gradlew assembleRelease

EXPECTED_APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
if [ -f "$EXPECTED_APK" ]; then
    echo ""
    echo "=========================================================="
    echo "  SUCCESS! Signed Release APK Built Successfully!         "
    echo "=========================================================="
    echo "APK Location: $EXPECTED_APK"
    ls -lh "$EXPECTED_APK"
else
    echo "[ERROR] Release APK was not found at $EXPECTED_APK"
    exit 1
fi
