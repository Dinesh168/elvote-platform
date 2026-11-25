import { Platform } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, hairline } from '@/design/tokens';

/**
 * spec flow-fixes O2: bottom menu style for both tab bars. 72 px for icon + label (labels were clipped below that), plus the
 * phone's bottom inset (home bar, Android buttons, browser toolbar) as extra bottom padding, so nothing is cut off.
 */
export function useTabBarStyle() {
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  // spec easy-redesign O1: Android edge-to-edge can report 0 before the first layout; use the window's inset then.
  const bottom = Math.max(insets.bottom, Platform.OS === 'android' ? initialWindowMetrics?.insets.bottom ?? 0 : 0);
  return {
    tabBarStyle: {
      backgroundColor: web ? colors.tabBar : colors.surface,
      borderTopWidth: hairline,
      borderTopColor: colors.separator,
      elevation: 0,
      height: 72 + bottom,
      paddingTop: 6,
      paddingBottom: 8 + bottom,
    },
    tabBarItemStyle: { paddingBottom: 0, justifyContent: 'center' as const },
  };
}
