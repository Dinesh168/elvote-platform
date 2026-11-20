/**
 * Build variants (spec live-demo D5). Without APP_VARIANT the config is app.json unchanged.
 * APP_VARIANT=demo: the demo APK for demo.champn.in — own package, Firebase sign-in
 * and Google sign-in (google-services.json from the Firebase project elvote-max; kept out of git) and the EAS project from EAS_PROJECT_ID.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (process.env.APP_VARIANT !== 'demo') return base;
  return {
    ...base,
    name: 'ElVote Demo',
    slug: base.slug,
    android: {
      ...base.android,
      package: 'in.champn.elvote.demo',
      googleServicesFile: './google-services.json',
    },
    plugins: [...(base.plugins ?? []), '@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-google-signin/google-signin'],
    extra: {
      ...base.extra,
      eas: { ...(base.extra?.eas ?? {}), projectId: process.env.EAS_PROJECT_ID ?? base.extra?.eas?.projectId },
    },
  };
};
