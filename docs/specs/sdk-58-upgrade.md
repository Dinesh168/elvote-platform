# Expo SDK 58 upgrade (REQ UP1–UP6) · status: built (2026-11-21)

Owner (2026-11-21): iPhone Expo Go from the App Store says "the installed version of Expo Go is for SDK 58.0.0, the project you opened uses SDK 54". Chose option B: upgrade the app to SDK 58. Confirmed the plan and defaults.

## Decisions
| # | Decision |
|---|---|
| UD1 | The old app at the repo root (`App.js`, `screens/`, Redux, react-native-paper) is **not kept building**; the new app is `src/` |
| UD2 | Owner asked to go **directly from 54 to 58** (2026-11-21), with the full check suite after the jump |
| UD3 | Work on branch **`feature/sdk-58`**; the SDK 54 state stays on `feature/app-v2-frontend` (commit `34a6b57`) |
| UD4 | Google sign-in 17.x; React Native Firebase 26.4.2 (27.x needs Kotlin 2.4 on Android) |

## Requirements
- **UP1** The app runs on Expo SDK 58 (React Native 0.88, React 19.3). `npx expo-doctor` reports no problems; `tsc` and ESLint are clean.
- **UP2** No user-visible change: every screen and flow works as before.
- **UP3** iPhone: the demo opens in the App Store Expo Go (SDK 58) from the QR link; email + password sign-in works.
- **UP4** Android APK rebuilt on SDK 58; installs; Google and email sign-in work.
- **UP5** Demo website rebuilt and redeployed; demo.champn.in works.
- **UP6** Native features on a real phone: location permission and polling-day check, notifications, offline storage, maps.

## Non-functional
- Same performance budgets, accessibility (axe clean) and en/hi/pa text as before.
- No backend, database or server change apart from redeploying the website.

## Known gaps
- iPhone Expo Go still has no Google sign-in, no phone push and no background location (Expo Go limits); a TestFlight build needs an Apple Developer account.
