import { router, useFocusEffect, usePathname } from 'expo-router';
import { Children, Fragment, isValidElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useWide } from '../layout';
import { PageTitleContext, useShell } from '../shellContext';
import { colors, spacing, touch, web } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { LangPill } from './Pills';

/** Screen frame: grouped background, safe area, iOS navigation bar row. */
export function Screen({
  children,
  scroll = true,
  back,
  inlineTitle,
  trailing,
  onBack,
  scrollProps,
  width,
  header,
}: {
  children: ReactNode;
  /** Phones: replaces the top bar (e.g. the team bar on main tabs, spec usability-r2 H1). Desktop keeps `trailing`. */
  header?: ReactNode;
  scroll?: boolean;
  /** Web desktop content width: default 1200; `medium` 960 (lists); `narrow` 720 (forms, settings). */
  width?: 'medium' | 'narrow';
  /** Label for the blue back link (e.g. "Home"); omit on root screens. */
  back?: string;
  inlineTitle?: string;
  trailing?: ReactNode;
  onBack?: () => void;
  scrollProps?: ScrollViewProps;
}) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  if (wide) return <DesktopScreen {...{ children, scroll, back, inlineTitle, trailing, onBack, scrollProps, width }} />;
  const hasBar = !!(back || inlineTitle || trailing);
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {header ?? (hasBar && (
        <View style={s.bar}>
          {back ? <BackLink label={back} onPress={onBack} /> : <View />}
          {inlineTitle ? (
            <AppText variant="headline" style={s.inlineTitle} numberOfLines={1} accessibilityRole="header">
              {inlineTitle}
            </AppText>
          ) : null}
          <View style={s.trailing}>{trailing}</View>
        </View>
      ))}
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }} keyboardShouldPersistTaps="handled" {...scrollProps}>
          {children}
        </ScrollView>
      ) : (
        <View style={s.fill}>{children}</View>
      )}
    </View>
  );
}

/** W3: web desktop page frame: breadcrumb top bar + centred content column (max 1200 px). */
function DesktopScreen({
  children, scroll = true, back, inlineTitle, trailing, onBack, scrollProps, width,
}: {
  children: ReactNode; scroll?: boolean; back?: string; inlineTitle?: string; trailing?: ReactNode; onBack?: () => void; scrollProps?: ScrollViewProps; width?: 'medium' | 'narrow';
}) {
  const max = width === 'narrow' ? 720 : width === 'medium' ? 960 : web.contentMax;
  const [title, setTitle] = useState<string>('');
  const shell = useShell();
  const path = usePathname();
  const current = inlineTitle ?? title;
  const isTop = !!shell?.topPaths.some((p) => p === path);
  const crumb = back && !isTop;
  // The sidebar owns the language switch, so a LangPill-only trailing slot is empty on desktop.
  const strip = (n: ReactNode): ReactNode[] =>
    Children.toArray(n).flatMap((c) => (isValidElement(c) && c.type === LangPill ? [] : isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment ? strip(c.props.children) : [c]));
  const tail = strip(trailing);
  trailing = tail.length ? tail : undefined;
  // Tab screens stay mounted, so set the browser tab title whenever this page gains focus.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web' && current && typeof document !== 'undefined') document.title = `${current} · ElVote`;
    }, [current]),
  );
  const body = <View style={[s.column, { maxWidth: max }]}>{children}</View>;
  return (
    <PageTitleContext.Provider value={setTitle}>
      <View style={s.root}>
        {crumb || trailing ? (
          <View style={s.topBar}>
            <View style={[s.column, s.topInner, { maxWidth: max }]}>
              {crumb ? (
                <View style={s.crumbs} accessibilityRole={'navigation' as never} aria-label="Breadcrumb">
                  <Pressable
                    accessibilityRole="link"
                    onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
                    style={(st) => [s.crumbLink, (st as { hovered?: boolean }).hovered && { opacity: 0.7 }]}
                  >
                    <AppText variant="callout" color={colors.accent}>{back}</AppText>
                  </Pressable>
                  {current ? (
                    <>
                      <Icon name="chevron-forward" size={14} color={colors.textTertiary} />
                      <AppText variant="callout" color={colors.textSecondary} numberOfLines={1} aria-current="page">{current}</AppText>
                    </>
                  ) : null}
                </View>
              ) : <View />}
              <View style={s.trailing}>{trailing}</View>
            </View>
          </View>
        ) : null}
        {scroll ? (
          <ScrollView contentContainerStyle={s.deskScroll} keyboardShouldPersistTaps="handled" {...scrollProps}>
            {body}
          </ScrollView>
        ) : (
          // Pages with their own list (Voters, Poll day): the column must fill the height so the list scrolls.
          <View style={[s.fill, s.deskFill]}>
            <View style={[s.column, s.fill, { maxWidth: max }]}>{children}</View>
          </View>
        )}
      </View>
    </PageTitleContext.Provider>
  );
}

export function BackLink({ label, onPress }: { label: string; onPress?: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={8}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      style={({ pressed }) => [s.back, pressed && { opacity: 0.5 }]}
    >
      <Icon name="chevron-back" size={28} color={colors.accent} />
      <AppText variant="body" color={colors.accent}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function LargeTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const setTitle = useContext(PageTitleContext);
  useEffect(() => setTitle?.(title), [setTitle, title]);
  return (
    <View style={s.large}>
      <AppText variant="largeTitle" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="callout" color={colors.textSecondary}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  bar: { height: touch.min, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  inlineTitle: { position: 'absolute', left: 80, right: 80, textAlign: 'center' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', height: touch.min, paddingRight: spacing.sm },
  large: { paddingHorizontal: spacing.lg, paddingTop: 2 },
  topBar: { height: web.topBar, borderBottomWidth: 1, borderBottomColor: web.border, backgroundColor: colors.surface, justifyContent: 'center' },
  topInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg + spacing.lg },
  column: { width: '100%', maxWidth: web.contentMax, alignSelf: 'center', paddingHorizontal: spacing.lg },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  crumbLink: { paddingVertical: 6 },
  deskScroll: { paddingTop: spacing.xxl, paddingBottom: 64 },
  deskFill: { paddingTop: spacing.xxl },
});
