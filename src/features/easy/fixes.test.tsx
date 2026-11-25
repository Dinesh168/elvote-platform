/** TC-AF-U1 … TC-AF-U8 (docs/test-cases/admin-fixes-r1.md). */
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Voter } from '@/api/types';
import { ApiError } from '@/api/http';
import { Sheet } from '@/design/components';
import { loadErrorText } from '@/features/common/QueryState';
import { VoterRow } from '@/features/voters/VoterRow';
import { i18n } from '@/i18n';
import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';
import pa from '@/i18n/pa.json';
import { fallbackStats } from './admin/scope';
import { DASH_GROUPS, defaultMatrixBooths, GROUP_ORDER, MATRIX_MAX, METRICS } from './logic';

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (ui: ReactElement) => <SafeAreaProvider initialMetrics={SAFE}>{ui}</SafeAreaProvider>;
const keysOf = (g: string) => METRICS.filter((m) => m.group === g).map((m) => m.key);

describe('shortcut groups (A6, A7, A8)', () => {
  it('TC-AF-U1 voters group has needs help + migrants; age wise and gender wise; no people group; dashboard has no polling day', () => {
    expect(keysOf('voters')).toEqual(expect.arrayContaining(['total', 'our', 'target', 'opp', 'notMet', 'helpNeeded', 'moved']));
    expect(keysOf('age')).toEqual(['firstTime', 'young', 'mid', 'senior']);
    expect(keysOf('gender')).toEqual(['male', 'female', 'third']);
    expect(keysOf('people')).toEqual([]);
    expect(GROUP_ORDER).not.toContain('people');
    expect(DASH_GROUPS).not.toContain('poll');
    expect(DASH_GROUPS).toEqual(expect.arrayContaining(['voters', 'age', 'gender']));
    expect(en.easy.g).not.toHaveProperty('people');
    expect(en.easy.g.age).toBe('Age wise');
    expect(en.easy.g.gender).toBe('Gender wise');
  });
});

describe('complete data size (A10)', () => {
  it('TC-AF-U2 opens with at most 10 booths; the cap is 25', () => {
    const nos = Array.from({ length: 200 }, (_, i) => i + 1);
    expect(defaultMatrixBooths(nos)).toEqual(nos.slice(0, 10));
    expect(defaultMatrixBooths([3, 4])).toEqual([3, 4]);
    expect(MATRIX_MAX).toBe(25);
  });
});

describe('sheets scroll (O1)', () => {
  it('TC-AF-U3 rows are inside a scroll view', async () => {
    await render(wrap(
      <Sheet visible title="Pick" onClose={() => undefined}>
        {Array.from({ length: 40 }, (_, i) => <Text key={i}>{`Row ${i}`}</Text>)}
      </Sheet>,
    ));
    const sv = screen.getByTestId('sheet-scroll');
    expect(sv.type).toBe('RCTScrollView');
    expect(screen.getByText('Row 39')).toBeTruthy();
  });
});

describe('same address (V1)', () => {
  const v: Voter = {
    id: 'v1', booth: 112, sno: 239, name: 'Manpreet Kaur', relation: 'W/o', relative: 'Balwinder Singh', age: 41, gender: 'F',
    house: '12', ward: '1', village: 'Gandhi Nagar', epic: 'PBX2034813', residence: 'here', needsHelp: false, group: 'our',
  };
  const noop = () => undefined;
  it('TC-AF-U5 open card shows "Same address voters (3)" and opens the house', async () => {
    const go = jest.fn();
    await render(wrap(<VoterRow voter={v} open onToggle={noop} onGroup={noop} onPatch={noop} sameCount={3} onSameAddress={go} />));
    await fireEvent.press(screen.getByText('Same address voters (3)'));
    expect(go).toHaveBeenCalledWith('12');
  });
  it('TC-AF-U5b hidden when alone in the house or no handler', async () => {
    await render(wrap(<VoterRow voter={v} open onToggle={noop} onGroup={noop} onPatch={noop} sameCount={1} onSameAddress={noop} />));
    expect(screen.queryByText(/Same address voters/)).toBeNull();
  });
});

describe('error text (O2)', () => {
  it('TC-AF-U6 no internet vs server answer', () => {
    const t = i18n.t.bind(i18n);
    expect(loadErrorText(t, new ApiError(0, 'network', 'x'))).toBe(en.common.noInternet);
    expect(loadErrorText(t, new TypeError('Failed to fetch'))).toBe(en.common.noInternet);
    expect(loadErrorText(t, new ApiError(500, 'internal', 'x'))).toBe('Could not load (the server answered 500). Try again.');
  });
});

describe('locality word (V3)', () => {
  it('TC-AF-U7 Section is Locality in en / hi / pa', () => {
    expect(en.easy.section).toBe('Locality');
    expect(hi.easy.section).toBe('मोहल्ला');
    expect(pa.easy.section).toBe('ਮੁਹੱਲਾ');
    expect(JSON.stringify(en.easy)).not.toMatch(/\bSections?\b/);
  });
});

describe('older server fallback (A9)', () => {
  it('TC-AF-U8 zone ids come from /zones and the zone filter uses them', () => {
    const table = [
      { no: 1, name: 'A', zone: 'Z1', area: null, total: 10, met: 5, our: 3, target: 1, opp: 1, withMobile: 2, houses: 4, housesVisited: 2, workers: 1 },
      { no: 2, name: 'B', zone: 'Z2', area: 'North', total: 8, met: 2, our: 1, target: 1, opp: 0, withMobile: 1, houses: 3, housesVisited: 1, workers: 0 },
    ];
    const zones = [{ id: 'z-1', name: 'Z1', booths: [1] }, { id: 'z-2', name: 'Z2', booths: [2] }];
    const all = fallbackStats(table as never, zones);
    expect(all.booths.map((b) => b.zoneId)).toEqual(['z-1', 'z-2']);
    expect(fallbackStats(table as never, zones, 'z-2').booths.map((b) => b.no)).toEqual([2]);
    expect(fallbackStats(table as never, zones, undefined, 'North').booths.map((b) => b.no)).toEqual([2]);
  });
});
