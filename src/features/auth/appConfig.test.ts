/** TC-LD-D5-1: the demo build variant (docs/specs/live-demo.md D5). */
import type { ExpoConfig } from 'expo/config';

const base = require('../../../app.json').expo as ExpoConfig;
const load = (env: Record<string, string | undefined>) => {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    let fn: (c: { config: ExpoConfig }) => ExpoConfig = () => base;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fn = require('../../../app.config').default;
    });
    return fn({ config: structuredClone(base) });
  } finally {
    process.env = saved;
  }
};

describe('app.config', () => {
  it('without APP_VARIANT the config equals app.json', () => {
    const c = load({ APP_VARIANT: undefined });
    expect(c.android?.package).toBe(base.android?.package);
    expect(c.name).toBe(base.name);
    expect(JSON.stringify(c.plugins)).toBe(JSON.stringify(base.plugins));
  });

  it('demo variant: own package, Firebase files and plugins, EAS project from env', () => {
    const c = load({ APP_VARIANT: 'demo', EAS_PROJECT_ID: 'demo-project-id' });
    expect(c.name).toBe('ElVote Demo');
    expect(c.android?.package).toBe('in.champn.elvote.demo');
    expect(c.android?.googleServicesFile).toBe('./google-services.json');
    const names = (c.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names).toEqual(expect.arrayContaining(['@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-google-signin/google-signin']));
    expect((c.extra as { eas: { projectId: string } }).eas.projectId).toBe('demo-project-id');
  });
});
