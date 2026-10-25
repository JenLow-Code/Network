# JenLow Network — real Android/iOS test applications

This project is Expo **React Native**, not merely a website. Use **EAS Build** to compile actual native packages in Expo's cloud, without locally installing Android Studio or Xcode.

## Prepare an Expo account
- Register/log in at https://expo.dev/ (account is separate from Cloudflare).
- From the repo root, switch to **frontend/** before running any EAS CLI commands.
- Run `npx eas-cli login`, then `npx eas-cli build:configure` to create/link the EAS project. This may add `extra.eas.projectId` to app.json. Commit that project ID to GitHub; it is not secret.
- Before each native build, ensure auth API is online, and run `npm install` and `npx expo-doctor@latest`.
- App identifiers are already set to `com.jenlow.network` on Android and iOS.

## Android — a real installable app (.apk)
From **frontend/**:

```sh
npx eas-cli build --platform android --profile preview
```

EAS may ask to create an Android signing keystore the first time. Let EAS manage it securely. When the build finishes, open the EAS build page on your Android phone and install the **APK**. Approve installation from the browser/file manager if prompted by Android. This is a fully compiled React Native APK, not a PWA, and it doesn't require publishing to Google Play.

## iPhone — real app (Apple signing required)
Apple requires an active **paid Apple Developer Program membership** for EAS physical-device internal distribution or TestFlight.

Option A, **one specific iPhone (Ad Hoc)**:

```sh
npx eas-cli device:create
npx eas-cli build --platform ios --profile preview
```

Use the device registration link/QR on the intended iPhone, allow the device registration to complete, then build. Open the finished build's install link on that registered iPhone. Depending on iOS setup, enable Developer Mode / trust the app if prompted.

Option B, **TestFlight**: build an iOS store-signed binary using `npx eas-cli build --platform ios --profile testflight`, submit with `npx eas-cli submit --platform ios --latest`, then invite your husband in App Store Connect > TestFlight. He installs TestFlight and accepts the invitation. Both options require paid Apple developer membership.

Without that membership, neither EAS iOS Ad Hoc nor TestFlight can produce a distributable standalone iPhone app. Expo Go is a limited playground and **cannot reliably test this app's custom native share extension**, especially with its Expo SDK version.

## Low storage / cloud-only development
EAS cloud builds run on Expo servers. The local CLI still needs a small checkout of the `frontend` directory and its JavaScript dependencies, or a GitHub Actions build using an `EXPO_TOKEN` secret after you've initialized an EAS project and its signing credentials. You do NOT need Android Studio or Xcode installed locally.

Do not put Expo access tokens, Android keystores or Apple signing keys into GitHub commits.

## Realism and limitations
- A compiled installable app is not proof all features work. Account verification/recovery, Google/Apple OAuth, cross-device data sync and native Bible share extension still need separate tests.
- The frontend login connects to the existing Cloudflare beta authentication Worker. Sessions are not yet persistently restored after closing/reopening the application.
- The Cloudflare web site and the native EAS packages come from the same React Native/Expo frontend, but they require **separate builds**.
