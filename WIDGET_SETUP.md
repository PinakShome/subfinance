# Home-screen widget — build & setup

A small/medium iOS **WidgetKit** widget showing your **monthly total** and
**next renewal**. It's scaffolded with [`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets)
and shares an **app group** (`group.com.subfinance.app`) with the app, which
pushes the summary whenever subscriptions load (`src/lib/widget.ts`).

> This can't be verified in CI — it needs a native build (Xcode/device or EAS).
> Everything below runs on your Mac.

## What's already wired
- `app.json` — `@bacons/apple-targets` plugin, the app-group entitlement on the
  app, and `userInterfaceStyle: "automatic"` (so dark mode follows the device).
- `targets/widget/` — `expo-target.config.js` + `index.swift` (the widget UI).
- `src/lib/widget.ts` — writes `monthlyTotal` / `nextName` / `nextWhen` to the
  app group and reloads the widget; called from `subscriptionStore.fetchAll`.
  It's a no-op anywhere the native target isn't present, so nothing breaks in
  Expo Go or before prebuild.

## Build steps
```bash
# 1. Install the config plugin (pins a compatible version)
npx expo install @bacons/apple-targets

# 2. Regenerate the native iOS project with the widget target + app group.
#    NOTE: prebuild manages ios/ from config going forward — commit the result
#    and make future native tweaks via config plugins, not by hand-editing ios/.
npx expo prebuild -p ios

# 3. Build & run on a simulator or device
npx expo run:ios
```

Then long-press the home screen → **+** → search **SubFinance** → add the
widget. Open the app once so it populates the shared data.

## Device / App Store (EAS)
- The app-group entitlement is already in `app.json`; EAS picks it up.
- In the Apple Developer portal, enable the **App Groups** capability for the
  app's App ID and the widget's App ID and add `group.com.subfinance.app`
  (Xcode/EAS can create these on first signed build).
- If you change the app's `bundleIdentifier` (e.g. the new ID for the
  Guideline 5.6 resubmission), update the app-group id in **four** places to
  match: `app.json` (`ios.entitlements` + `extra.appleTargets.appGroup`),
  `targets/widget/expo-target.config.js`, `targets/widget/index.swift`
  (`appGroup`), and `src/lib/widget.ts` (`APP_GROUP`).
