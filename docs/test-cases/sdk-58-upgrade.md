# Test cases: Expo SDK 58 upgrade (spec `docs/specs/sdk-58-upgrade.md`)

Status: ⬜ not run · ✅ pass · ❌ fail.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-UP-1 | UP1 | tool | `npx expo-doctor` | no problems | ✅ |
| TC-UP-2 | UP1 | tool | `npx tsc --noEmit`, ESLint on `src` | clean | ✅ |
| TC-UP-3 | UP2 | unit | Jest (all) | all pass (121 before) | ✅ |
| TC-UP-4 | UP2 | api | backend vitest | 158/158 (unchanged backend) | ⬜ |
| TC-UP-5 | UP2 | ui | puppeteer: `aa-ui.js` (accounts), `pd-ui.js` (polling day), `br-ui.js` (bilingual roll), `sync-ui.js` (offline), `web-desktop.js` | all pass, axe clean, no page errors | ✅ |
| TC-UP-6 | UP5 | ui | demo build sign-in screen (`demo-login.js`) | Google + email shown, axe clean | ✅ |
| TC-UP-7 | UP3 | manual | iPhone Expo Go (SDK 58) opens the QR link; create account / sign in with email | app opens, signed in | ⬜ |
| TC-UP-8 | UP4 | build + manual | `eas build -p android --profile demo`; install; Google sign-in | build finished; signed in | ⬜ |
| TC-UP-9 | UP6 | manual | Android phone: polling-day location prompt, notification permission, offline save + sync, map | all work | ⬜ |

**Run 2026-11-21 (SDK 58.0.26, React Native 0.88.1, React 19.3):** expo-doctor 20/20; tsc clean; ESLint 0 errors; Jest 121/121; puppeteer accounts 26/26, polling day all pass, bilingual roll 26/26, offline sync all pass, desktop 17/17 (menu count updated for the Requests page). Backend unchanged (158/158 on 2026-11-20).

Fixed during the upgrade:
- Expo Router 58: `href: null` now hides a tab **and redirects away from it**, so admin and volunteer pages without a tab button (booth, zones, overview, roll, tasks list, surnames, …) bounced to the first tab. They now use `NO_TAB_BUTTON` (`src/features/shell/tabs.ts`); `href: null` stays only for tabs whose feature is switched off.
- Config: `android.edgeToEdgeEnabled` and `newArchEnabled` removed (always on); splash moved to the `expo-splash-screen` plugin (vertical logo, 200 px wide).
- Tooling: Jest 30 + `@react-native/jest-preset`, TypeScript 6 (`baseUrl` removed, `types: ["jest","node"]`), `eslint-config-expo` 58, `react-refresh` for the web bundle, `standard-navigation` added to Jest transforms.
- New React lint rules: components moved out of render (requests, register, register-admin), sign-in effect order, task dates computed once, voters list ref written in an effect; deliberate state syncs annotated.
- Google sign-in 17.0.0; React Native Firebase stays on 26.4.2 (see APK build fixes below).

**Ship 2026-11-21:** iPhone Expo Go update published on runtime `exposdk:58.0.0` (channel `demo`); demo website rebuilt and redeployed (sign-in screen checked, axe clean); Android APK built on SDK 58 (same signing key, so the Firebase SHA-1/SHA-256 are unchanged). TC-UP-7/8/9 (real devices) are for the owner.

APK build fixes:
- `.npmrc` `legacy-peer-deps=true`: the lock file is resolved without auto-installed peers (old-app packages declare React 18 peers), and EAS runs `npm ci`, which must use the same mode.
- `@expo/config-plugins` installed directly: the React Native Firebase config plugin still imports it (expo-doctor flags this; expected).
- Old-app native packages excluded from autolinking (`package.json` → `expo.autolinking.exclude`): `@react-native-community/masked-view` (uses the removed `jcenter()`), `react-native-maps`, `react-native-pager-view`. The old developer's Google Maps key removed from `app.json`.
- React Native Firebase pinned to 26.4.2: 27.x pulls Android `firebase-auth` 25 compiled with Kotlin 2.4, newer than the build's Kotlin 2.2.
