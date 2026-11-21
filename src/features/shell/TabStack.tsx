/**
 * A page stack inside one bottom tab (spec usability-r2 U2): pages opened from a tab are pushed on top of it, so the
 * iPhone edge swipe and the Android back gesture / button return to the previous page instead of the first tab.
 */
import { Stack } from 'expo-router';
import { colors } from '@/design/tokens';

export function TabStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, gestureEnabled: true, fullScreenGestureEnabled: true }} />;
}
