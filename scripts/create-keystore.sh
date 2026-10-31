#!/usr/bin/env bash
# Automated generation of release signing keystore for SayHola Android App.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
KEYSTORE_FILE="$ANDROID_DIR/sayhola-release.jks"
PROPERTIES_FILE="$ANDROID_DIR/keystore.properties"

echo "=========================================================="
echo "  SayHola - Automated Android Release Keystore Generator  "
echo "=========================================================="
echo ""

if [ -f "$KEYSTORE_FILE" ]; then
    echo "[WARNING] An existing release keystore was detected at:"
    echo "  $KEYSTORE_FILE"
    echo ""
    echo "CRITICAL: If you have already published an APK or update signed with this key,"
    echo "overwriting it will make it IMPOSSIBLE to update existing installs on users' devices"
    echo "or update your app on Google Play!"
    echo ""
    read -p "Are you ABSOLUTELY sure you want to overwrite it? Type 'YES' to proceed: " confirm
    if [ "$confirm" != "YES" ]; then
        echo "Aborted without changes. Existing keystore preserved."
        exit 0
    fi
fi

# Locate keytool
KEYTOOL_CMD="keytool"
if ! command -v keytool &> /dev/null; then
    if [ -n "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/keytool" ]; then
        KEYTOOL_CMD="$JAVA_HOME/bin/keytool"
    else
        echo "[ERROR] keytool command not found. Please install Java JDK 17+ or add keytool to PATH."
        exit 1
    fi
fi

echo "Choose a password for your new release keystore (min 6 characters):"
read -s -p "Enter Keystore Password: " STORE_PASS
echo ""
read -s -p "Confirm Keystore Password: " STORE_PASS_CONFIRM
echo ""

if [ "$STORE_PASS" != "$STORE_PASS_CONFIRM" ]; then
    echo "[ERROR] Passwords do not match!"
    exit 1
fi

if [ ${#STORE_PASS} -lt 6 ]; then
    echo "[ERROR] Password must be at least 6 characters!"
    exit 1
fi

ALIAS_NAME="sayhola"
DNAME="CN=SayHola, OU=Mobile, O=MK Labs, L=Default, ST=Default, C=US"

echo "Generating 2048-bit RSA keystore..."
"$KEYTOOL_CMD" -genkeypair -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$ALIAS_NAME" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$STORE_PASS" \
    -keypass "$STORE_PASS" \
    -dname "$DNAME"

cat <<EOF > "$PROPERTIES_FILE"
# SayHola Android Release Signing Properties
# DO NOT COMMIT THIS FILE TO VERSION CONTROL
storeFile=sayhola-release.jks
storePassword=$STORE_PASS
keyAlias=$ALIAS_NAME
keyPassword=$STORE_PASS
EOF

echo ""
echo "=========================================================="
echo "  SUCCESS! Release Keystore and Configuration Generated!  "
echo "=========================================================="
echo "Keystore file:   $KEYSTORE_FILE"
echo "Properties file: $PROPERTIES_FILE"
echo "Key alias:       $ALIAS_NAME"
echo ""
echo "Next step: Run 'npm run android:build:apk' to build your signed Release APK."
