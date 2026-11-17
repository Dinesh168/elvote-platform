import { useWindowDimensions, Platform } from 'react-native';
import { THEME } from '../../theme';

/**
 * Responsive design hook — provides reactive screen dimensions,
 * breakpoint flags, and utility functions for adaptive layouts.
 *
 * Usage:
 *   const { isMobile, isTablet, isDesktop, columns, gridItemWidth, responsiveValue, contentMaxWidth } = useResponsive();
 */
export default function useResponsive() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isMobile = screenWidth < THEME.BREAKPOINT.TABLET;
  const isTablet = screenWidth >= THEME.BREAKPOINT.TABLET && screenWidth < THEME.BREAKPOINT.DESKTOP;
  const isDesktop = screenWidth >= THEME.BREAKPOINT.DESKTOP;
  const isWide = screenWidth >= THEME.BREAKPOINT.WIDE;
  const isWeb = Platform.OS === 'web';

  // Auto-calculated grid columns based on screen width
  const columns = isMobile ? 2 : isTablet ? 3 : isWide ? 5 : 4;

  // Max-width for main content area (prevents ultra-wide stretching on web)
  const contentMaxWidth = isDesktop ? 1200 : screenWidth;

  // Actual content width (accounts for max-width capping)
  const contentWidth = Math.min(screenWidth, contentMaxWidth);

  /**
   * Returns value based on current breakpoint
   * @param {*} mobile - Value for mobile screens (< 768px)
   * @param {*} tablet - Value for tablet screens (768-1024px)
   * @param {*} desktop - Value for desktop screens (> 1024px)
   */
  const responsiveValue = (mobile, tablet, desktop) => {
    if (isDesktop) return desktop ?? tablet ?? mobile;
    if (isTablet) return tablet ?? mobile;
    return mobile;
  };

  /**
   * Calculate grid item width based on columns and gap
   * @param {number} gap - Gap between items in pixels
   * @param {number} cols - Override column count (default: auto)
   * @param {number} containerPadding - Horizontal padding of the container
   */
  const gridItemWidth = (gap = 10, cols = columns, containerPadding = 16) => {
    const availableWidth = contentWidth - (containerPadding * 2);
    const totalGaps = gap * (cols - 1);
    return Math.floor((availableWidth - totalGaps) / cols);
  };

  /**
   * Responsive horizontal padding for content containers
   */
  const horizontalPadding = responsiveValue(
    THEME.SPACING.LG,
    THEME.SPACING.XL,
    THEME.SPACING.XXL
  );

  /**
   * Returns style object for centering content with max-width on web
   */
  const containerStyle = {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: horizontalPadding,
  };

  /**
   * Dashboard specific responsive calculations
   */
  const summaryCardCols = isMobile ? 2 : isTablet ? 3 : 4;
  const summaryCardWidth = gridItemWidth(THEME.SPACING.MD, summaryCardCols);

  const chartCols = isMobile ? 1 : 2;
  const dashboardChartWidth = gridItemWidth(THEME.SPACING.MD, chartCols);

  return {
    screenWidth,
    screenHeight,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isWeb,
    columns,
    contentMaxWidth,
    contentWidth,
    responsiveValue,
    gridItemWidth,
    horizontalPadding,
    containerStyle,
    summaryCardWidth,
    dashboardChartWidth,
  };
}
