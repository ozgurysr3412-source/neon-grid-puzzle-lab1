# Grid Crown iOS Build (Codemagic, Mac olmadan)

Bu repo iOS build icin hazirlandi. `ios/` klasoru eklendi ve AdMob iOS ayarlari kod tarafinda yapildi.

## 1) GitHub'a yuklenecekler

- `src/main.js`
- `src/platform/adMobService.js`
- `package.json`
- `package-lock.json`
- `ios/` klasorunun tamami

## 2) Codemagic on kosullar

- Apple Developer hesabin bagli olmali.
- Codemagic -> Team settings:
  - App Store Connect API key ekli olmali.
  - iOS certificate/provisioning profile otomatik cekilebilmeli.
- Bundle ID: `com.ozgur72.gridcrownblockblast`

## 3) Codemagic build script (UI > Build > Scripts)

```bash
npm ci
npm run build:web
npx cap sync ios
/usr/libexec/PlistBuddy -c "Set :GADApplicationIdentifier ca-app-pub-4788652923724034~5337780715" ios/App/App/Info.plist || /usr/libexec/PlistBuddy -c "Add :GADApplicationIdentifier string ca-app-pub-4788652923724034~5337780715" ios/App/App/Info.plist
cd ios/App
pod install
cd ../..
```

## 4) Build ayarlari

- Xcode Workspace: `ios/App/App.xcworkspace`
- Scheme: `App`
- Artifact: `.ipa`

## 5) AdMob iOS birimleri

- App ID: `ca-app-pub-4788652923724034~5337780715`
- Banner: `ca-app-pub-4788652923724034/1398535704`
- Interstitial: `ca-app-pub-4788652923724034/8051573969`
- Rewarded: `ca-app-pub-4788652923724034/8433727661`

## 6) Test

- Banner: oyun icinde alt alanda gorunmeli.
- Interstitial: oyun akisinda tetiklenen noktalarda acilmali.
- Rewarded: Continue/odul akisinda acilmali.
- Remove Ads satin alimindan sonra banner/interstitial kapanmali, rewarded acik kalmali.
