import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, hairline } from '@/design/tokens';

/**
 * spec flow-fixes O2: bottom menu style for both tab bars. The bar is its own height plus the phone's bottom inset
 * (home bar, Android buttons, browser toolbar), with the inset as bottom padding, so icons and labels are never cut off.
 */
export function useTabBarStyle() {
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const bottom = Math.max(insets.bottom, web ? 6 : 8);
  return {
    tabBarStyle: {
      backgroundColor: web ? colors.tabBar : colors.surface,
      borderTopWidth: hairline,
      borderTopColor: colors.separator,
      elevation: 0,
      height: 56 + bottom,
      paddingTop: 6,
      paddingBottom: bottom,
    },
    tabBarItemStyle: { paddingBottom: 0 },
  };
}
