# FlashBites Play Store Launch Guide

This guide gives the exact path to publish the Android app on Google Play.

## 1) Install Java 17 (required for Gradle)

On macOS, install Java 17 and verify:

```bash
java -version
```

If `java` is still not found after install, set `JAVA_HOME`:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
```

Add those lines to your shell profile (`~/.zshrc`) to persist.

## 2) Create upload keystore (one-time)

From `frontend/android`:

```bash
mkdir -p ../keystores
keytool -genkeypair -v \
  -keystore ../keystores/upload-keystore.jks \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Save this keystore safely (password manager + encrypted backup).

## 3) Configure signing secrets

Copy template and fill real passwords:

```bash
cp key.properties.example key.properties
```

File to edit: `frontend/android/key.properties`

Required keys:
- `storeFile`
- `storePassword`
- `keyAlias`
- `keyPassword`

## 4) Bump app version before every upload

Edit `frontend/android/app/build.gradle`:
- Increase `versionCode` by 1 (integer only).
- Update `versionName` (example `1.0.1`).

## 5) Build release AAB

From `frontend`:

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

Output AAB:

`frontend/android/app/build/outputs/bundle/release/app-release.aab`

## 6) Publish in Google Play Console

1. Create app in Play Console (if first time).
2. Complete Store listing, App content, Data safety, and Privacy policy.
3. Go to Production > Create new release.
4. Upload `app-release.aab`.
5. Add release notes and submit for review.

## 7) After first publish

For each update:
1. Increase `versionCode` and `versionName`.
2. Build new AAB.
3. Upload in Production release.

---

## Common errors

### Missing android/key.properties
Create it from `key.properties.example`.

### Unable to locate a Java Runtime
Install Java 17 and confirm `java -version` in same terminal session.

### Signing key not found
Verify `storeFile` path in `key.properties` points to a real `.jks` file.
