#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

JAVA_HOME_DEFAULT="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
ANDROID_HOME_DEFAULT="$HOME/Library/Android/sdk"

export JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_HOME_DEFAULT}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

if [[ ! -d "$JAVA_HOME" ]]; then
  echo "JAVA_HOME not found: $JAVA_HOME"
  echo "Install Android Studio or set JAVA_HOME manually."
  exit 1
fi

if [[ ! -d "$ANDROID_HOME" ]]; then
  echo "ANDROID_HOME not found: $ANDROID_HOME"
  echo "Install Android SDK or set ANDROID_HOME manually."
  exit 1
fi

printf 'sdk.dir=%s\n' "$ANDROID_HOME" > "$PROJECT_ROOT/android/local.properties"

cd "$PROJECT_ROOT"
npm run app:sync
npx cap run android
