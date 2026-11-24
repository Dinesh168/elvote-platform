/**
 * Build variants (spec live-demo D5, D9, D10). Without APP_VARIANT the config is app.json unchanged.
 * APP_VARIANT=demo: the demo app for demo.champn.in —
 *  - own Android package and the owner's EAS project (EAS_PROJECT_ID, set in eas.json),
 *  - Firebase + Google sign-in (google-services.json from Firebase project elvote-max; kept out of git — on EAS it
 *    comes from the file variable GOOGLE_SERVICES_JSON),
 *  - EAS Update on the Expo Go runtime, so the same app also opens in Expo Go on an iPhone.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (process.env.APP_VARIANT !== 'demo') return base;
  const projectId = process.env.EAS_PROJECT_ID;
  return {
    ...base,
    name: 'ElVote Demo',
    slug: base.slug,
    android: {
      ...base.android,
      package: 'in.champn.elvote.demo',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    // iPhone (App Store / TestFlight): own bundle id; Firebase iOS config from the EAS file variable GOOGLE_SERVICE_INFO_PLIST
    // (GoogleService-Info.plist of the iOS app registered in Firebase project elvote-max; not in git).
    ios: {
      ...base.ios,
      bundleIdentifier: 'in.champn.elvote.demo',
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
      infoPlist: { ...(base.ios?.infoPlist ?? {}), ITSAppUsesNonExemptEncryption: false },
    },
    plugins: [...(base.plugins ?? []), '@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-google-signin/google-signin'],
    // Expo Go can open an update only when its runtime is the SDK version.
    runtimeVersion: { policy: 'sdkVersion' },
    ...(projectId ? { updates: { url: `https://u.expo.dev/${projectId}` } } : {}),
    extra: {
      ...base.extra,
      eas: { projectId },
    },
  };
};
