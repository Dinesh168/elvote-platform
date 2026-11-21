/**
 * A page inside a tab navigator that opens normally but has no button in the tab bar (booth detail, zones, …).
 * Expo Router 58: `href: null` now hides a tab AND redirects away from it, so it is kept only for tabs whose
 * feature is switched off; reachable pages use this instead.
 */
export const NO_TAB_BUTTON = { tabBarButton: () => null, tabBarItemStyle: { display: 'none' as const } };
