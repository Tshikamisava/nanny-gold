# NannyGold Mobile App — Build & Release Guide

## Overview

NannyGold's web app is wrapped as native Android and iOS apps using **Capacitor v6**. The web app runs inside a native WebView with access to device APIs (push notifications, haptics, splash screen, status bar, etc.).

---

## Prerequisites

### Android
- **Android Studio** (latest stable) — [Download](https://developer.android.com/studio)
- **JDK 17+** (bundled with Android Studio)
- Android SDK with API Level 34+ (install via Android Studio → SDK Manager)

### iOS (Mac only)
- **Xcode 15+** — from Mac App Store
- **CocoaPods** — `sudo gem install cocoapods`
- An Apple Developer account for device testing and distribution

---

## Quick Start

### Development Workflow

```bash
# 1. Build the web app
npm run build

# 2. Sync web assets to both platforms
npm run cap:sync

# 3. Open in native IDE
npm run cap:open:android   # Opens Android Studio
npm run cap:open:ios       # Opens Xcode (Mac only)
```

### One-Command Build & Open

```bash
npm run mobile:android     # Build + sync + open Android Studio
npm run mobile:ios         # Build + sync + open Xcode
```

### Live Reload (Development)

For hot-reload during development, uncomment the server block in `capacitor.config.ts` and set your local IP:

```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:5173',
  cleartext: true,
},
```

Then run:
```bash
npm run dev                # Start Vite dev server
npx cap run android        # Run on connected Android device/emulator
npx cap run ios            # Run on connected iOS device/simulator
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run cap:sync` | Sync web build to both Android and iOS |
| `npm run cap:sync:android` | Sync web build to Android only |
| `npm run cap:sync:ios` | Sync web build to iOS only |
| `npm run cap:open:android` | Open project in Android Studio |
| `npm run cap:open:ios` | Open project in Xcode |
| `npm run mobile:android` | Build + sync + open Android Studio |
| `npm run mobile:ios` | Build + sync + open Xcode |
| `npm run mobile:build` | Build + sync both platforms |

---

## Project Structure

```
android/                    # Android Studio project
├── app/
│   └── src/main/
│       ├── AndroidManifest.xml  # Permissions & app config
│       ├── assets/public/       # Web build (auto-synced)
│       ├── java/.../            # Native Java code
│       └── res/                 # Icons, splash, colors
ios/                        # Xcode project
├── App/
│   └── App/
│       ├── Info.plist           # iOS permissions & config
│       ├── Assets.xcassets/     # App icons
│       ├── public/              # Web build (auto-synced)
│       └── AppDelegate.swift    # Native Swift code
capacitor.config.ts         # Capacitor configuration
src/utils/nativePlatform.ts # Platform detection & native init
```

---

## Native Plugins Included

| Plugin | Purpose |
|--------|---------|
| `@capacitor/app` | App lifecycle events, back button handling |
| `@capacitor/haptics` | Vibration feedback |
| `@capacitor/keyboard` | Keyboard show/hide events, resize behavior |
| `@capacitor/status-bar` | Status bar styling (color, style) |
| `@capacitor/splash-screen` | Custom splash screen with NannyGold branding |
| `@capacitor/push-notifications` | Push notification registration & handling |
| `@capacitor/browser` | In-app browser for external links |
| `@capacitor/share` | Native share sheet |

---

## Building for Release

### Android (APK / AAB)

1. Open in Android Studio: `npm run cap:open:android`
2. Go to **Build → Generate Signed Bundle / APK**
3. Create or select a keystore file (keep this safe — required for all future updates!)
4. Choose **Android App Bundle (AAB)** for Google Play Store, or **APK** for direct distribution
5. Select **release** build variant
6. Build — output will be in `android/app/build/outputs/`

#### Signing Configuration (for CI/CD)

Add to `android/app/build.gradle`:
```groovy
android {
    signingConfigs {
        release {
            storeFile file('path/to/keystore.jks')
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### iOS (IPA)

1. Open in Xcode: `npm run cap:open:ios`
2. Select the **App** target → **Signing & Capabilities**
3. Set your **Team** (Apple Developer account)
4. Set **Bundle Identifier** to `co.za.nannygold.app`
5. Go to **Product → Archive**
6. In the Organizer, click **Distribute App** and follow the wizard

---

## App Store Submission

### Google Play Store
- Upload the `.aab` file to [Google Play Console](https://play.google.com/console)
- Required: App icons (512x512), screenshots, privacy policy URL
- Bundle ID: `co.za.nannygold.app`

### Apple App Store
- Submit via Xcode Organizer or [App Store Connect](https://appstoreconnect.apple.com)
- Required: App icons (1024x1024), screenshots for all device sizes, privacy policy URL
- Bundle ID: `co.za.nannygold.app`

---

## App Icons & Splash Screen

### Current Icons
The PWA icons in `public/lovable-uploads/` are used for the web app. For native apps, you need platform-specific icons:

### Android Icons
Located in `android/app/src/main/res/mipmap-*/`. Replace the default Capacitor icons:
- `mipmap-mdpi/`: 48x48px
- `mipmap-hdpi/`: 72x72px
- `mipmap-xhdpi/`: 96x96px
- `mipmap-xxhdpi/`: 144x144px
- `mipmap-xxxhdpi/`: 192x192px

Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) to generate all sizes from a single 1024x1024 icon.

### iOS Icons
Located in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`. Open in Xcode's Asset Catalog editor and drag icons into the appropriate slots.

### Splash Screen
- Android: Replace `android/app/src/main/res/drawable/splash.png`
- iOS: Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard` in Xcode

#### Generate All Resources (Recommended)
```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#D946EF' --splashBackgroundColor '#D946EF'
```
Place a `resources/icon.png` (1024x1024) and `resources/splash.png` (2732x2732) in the project root first.

---

## Push Notifications Setup

### Firebase (Android)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create/select a project
3. Add an Android app with package name `co.za.nannygold.app`
4. Download `google-services.json`
5. Place it in `android/app/`

### APNs (iOS)
1. Enable Push Notifications in Xcode → Signing & Capabilities
2. Create an APNs key in Apple Developer portal
3. Upload the key to your push notification service

---

## Troubleshooting

### Android
- **Build fails**: Run `cd android && ./gradlew clean` then rebuild
- **Plugin not found**: Run `npx cap sync android` to re-sync plugins
- **White screen**: Check logcat for JavaScript errors: `adb logcat | grep -i "console\|error"`

### iOS
- **Pod install fails**: Run `cd ios/App && pod install --repo-update`
- **Signing issues**: Ensure your Apple Developer team is selected in Xcode
- **Simulator not working**: Reset simulator: Device → Erase All Content and Settings

### General
- **Web changes not showing**: Always run `npm run build && npx cap sync` before testing
- **Cache issues**: Clear Capacitor data in app settings or reinstall
