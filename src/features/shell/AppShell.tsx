import { router, usePathname } from 'expo-router';
import { themed } from '@/design/theme';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, ChoiceRow, Icon, Sheet } from '@/design/components';
import { useLayout } from '@/design/layout';
import { ShellContext } from '@/design/shellContext';
import { colors, radius, spacing, web } from '@/design/tokens';
import { fileUrl, useAllowedLangs } from '@/features/session/customer';
import { activate, logout, rolesOf } from '@/features/session/session';
import { initI18n, type Lang } from '@/i18n';
import { usePrefs } from '@/stores/prefs';
import { useActiveMembership, useSession, type Mode } from '@/stores/session';

export interface NavItem {
  path: string;
  label: string;
  icon: [string, string];
  /** Other paths that count as this item (e.g. a booth page under Dashboard). */
  also?: string[];
  /** Unread count (e.g. polling-day alerts); shown as a red badge. */
  badge?: number;
}

type Hoverable = { hovered?: boolean; pressed: boolean };

/** W2: web desktop frame: left sidebar (240 px, or 72 px icon rail) + page. Phones never render this. */
export function AppShell({ items, mode, children }: { items: NavItem[]; mode: Mode; children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const layout = useLayout();
  const rail = layout === 'rail';
  const path = usePathname();
  const me = useSession((s) => s.me);
  const m = useActiveMembership();
  const setLang = usePrefs((s) => s.setLang);
  const [acOpen, setAcOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const shell = useMemo(() => ({ topPaths: items.map((i) => i.path) }), [items]);
  const adminRoles = me ? rolesOf(me).filter((r) => r.mode === mode && r.mode !== 'platform') : [];
  const otherRoles = me ? rolesOf(me).filter((r) => r.mode !== mode) : [];
  const pa = i18n.language === 'pa';
  const look = mode === 'platform' ? null : m?.look;
  const brandName = look?.appName || 'ElVote';
  const logo = fileUrl(look?.logoUrl);
  const langs = useAllowedLangs();
  const roleLabel = mode === 'platform' ? t('web.rolePlatform') : mode === 'admin' ? t('web.roleAdmin') : t('web.roleVolunteer');
  // The current item is the one with the longest matching path prefix (so /platform/parties ≠ /platform).
  const score = (it: NavItem) =>
    Math.max(-1, ...[it.path, ...(it.also ?? [])].map((p) => (path === p || path.startsWith(`${p}/`) ? p.length : -1)));
  const best = items.reduce<NavItem | null>((a, it) => (score(it) > (a ? score(a) : -1) ? it : a), null);
  const isOn = (it: NavItem) => it === best;
  const initials = (me?.user.name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const switchLang = (l: Lang) => { setLang(l); void initI18n(l); };

  return (
    <ShellContext.Provider value={shell}>
      <View style={s.root}>
        <View style={[s.side, rail && s.sideRail]} role="navigation" aria-label={t('web.menu')}>
          <View style={[s.brand, rail && s.center]}>
            {logo ? (
              <Image source={{ uri: logo }} style={s.logoImg} accessibilityLabel={brandName} />
            ) : (
              <View style={[s.logo, { backgroundColor: colors.accent }]}><AppText variant="headline" weight="bold" color={colors.textOnAccent}>{brandName.slice(0, 1)}</AppText></View>
            )}
            {!rail ? <AppText variant="title2" numberOfLines={1} style={s.flex}>{brandName}</AppText> : null}
          </View>

          {mode !== 'platform' && m && !rail ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('web.switchAc')}: ${t('admin.acTitle', { no: m.acNo, name: m.acName })}`}
              disabled={adminRoles.length < 2}
              onPress={() => setAcOpen(true)}
              style={(st) => [s.ac, (st as Hoverable).hovered && adminRoles.length > 1 && { backgroundColor: web.hover }]}
            >
              <View style={s.flex}>
                <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{m.partyName}</AppText>
                <AppText variant="callout" weight="semibold" numberOfLines={1}>{t('admin.acTitle', { no: m.acNo, name: m.acName })}</AppText>
              </View>
              {adminRoles.length > 1 ? <Icon name="chevron-expand" size={16} color={colors.textSecondary} /> : null}
            </Pressable>
          ) : null}

          <ScrollView style={s.flex} contentContainerStyle={s.nav}>
            {items.map((it) => {
              const on = isOn(it);
              return (
                <Pressable
                  key={it.path}
                  // A real <a href> on the web: Enter, middle-click and "open in new tab" work; a normal click stays in the app.
                  {...({ href: it.path } as object)}
                  accessibilityRole="link"
                  accessibilityLabel={it.badge ? `${it.label}, ${t('web.unread', { n: it.badge })}` : it.label}
                  aria-current={on ? 'page' : undefined}
                  onPress={(e) => {
                    const ev = e as unknown as { preventDefault?: () => void; metaKey?: boolean; ctrlKey?: boolean; nativeEvent?: { metaKey?: boolean; ctrlKey?: boolean } };
                    if (ev.nativeEvent?.metaKey || ev.nativeEvent?.ctrlKey) return; // let the browser open a new tab
                    ev.preventDefault?.();
                    router.navigate(it.path as never);
                  }}
                  style={(st) => [s.item, rail && s.itemRail, on ? s.itemOn : (st as Hoverable).hovered && { backgroundColor: web.hover }]}
                >
                  <Icon name={it.icon[on ? 0 : 1]} size={20} color={on ? colors.accent : colors.textSecondary} />
                  {!rail ? <AppText variant="body" weight={on ? 'semibold' : 'medium'} color={on ? colors.accent : colors.text} numberOfLines={1} style={s.flex}>{it.label}</AppText> : null}
                  {it.badge ? (
                    <View style={[s.badge, rail && s.badgeRail]}><AppText variant="caption" weight="bold" color={colors.textOnAccent} tabular>{it.badge > 99 ? '99+' : String(it.badge)}</AppText></View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={s.foot}>
            {langs.length < 2 && mode !== 'platform' ? null : rail ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.switchLangA11y')} onPress={() => switchLang(pa ? 'en' : 'pa')}
                style={(st) => [s.item, s.itemRail, (st as Hoverable).hovered && { backgroundColor: web.hover }]}>
                <AppText variant="callout" weight="bold">{pa ? 'A' : 'ਪੰ'}</AppText>
              </Pressable>
            ) : (
              <View style={s.langRow} role="radiogroup" aria-label={t('web.language')}>
                {([['pa', 'ਪੰਜਾਬੀ'], ['en', 'English']] as [Lang, string][]).map(([l, label]) => {
                  const on = i18n.language === l;
                  return (
                    <Pressable key={l} role="radio" aria-checked={on} onPress={() => switchLang(l)} style={[s.lang, on && s.langOn]}>
                      <AppText variant="footnote" weight="semibold" color={colors.text}>{label}</AppText>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {otherRoles.length && !rail ? (
              <Pressable accessibilityRole="link" onPress={() => router.push('/choose')} style={(st) => [s.item, (st as Hoverable).hovered && { backgroundColor: web.hover }]}>
                <Icon name="swap-horizontal" size={20} color={colors.textSecondary} />
                <AppText variant="body" weight="medium">{t('me2.switchRole')}</AppText>
              </Pressable>
            ) : null}
            <View style={[s.user, rail && s.center]}>
              {!rail ? <View style={s.avatar}><AppText variant="footnote" weight="bold" color={colors.accent}>{initials || '?'}</AppText></View> : null}
              {!rail ? (
                <View style={s.flex}>
                  <AppText variant="callout" weight="semibold" numberOfLines={1}>{me?.user.name ?? ''}</AppText>
                  <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{roleLabel}</AppText>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={confirm ? t('web.signOutConfirm') : t('web.signOut')}
                onPress={() => (confirm ? void logout() : setConfirm(true))}
                onBlur={() => setConfirm(false)}
                style={(st) => [s.iconBtn, confirm && { backgroundColor: colors.dangerTint }, (st as Hoverable).hovered && !confirm && { backgroundColor: web.hover }]}
              >
                <Icon name="log-out-outline" size={20} color={confirm ? colors.danger : colors.textSecondary} />
              </Pressable>
            </View>
            {confirm && !rail ? <AppText variant="footnote" color={colors.danger} style={s.confirm}>{t('web.signOutConfirm')}</AppText> : null}
          </View>
        </View>
        <View style={s.main} role="main">{children}</View>
      </View>

      <Sheet visible={acOpen} title={t('web.switchAc')} onClose={() => setAcOpen(false)}>
        {adminRoles.map((r, i) => {
          const am = me?.memberships.find((x) => x.id === r.membershipId);
          return (
            <ChoiceRow key={r.membershipId} title={t('admin.acTitle', { no: am?.acNo, name: am?.acName })} subtitle={am?.partyName} selected={r.membershipId === m?.id}
              onPress={() => { setAcOpen(false); void activate(r); }} last={i === adminRoles.length - 1} />
          );
        })}
      </Sheet>
    </ShellContext.Provider>
  );
}

const s = themed(() => StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  side: { width: web.sidebar, backgroundColor: web.sidebarBg, borderRightWidth: 1, borderRightColor: web.border, paddingVertical: spacing.lg },
  sideRail: { width: web.rail },
  center: { justifyContent: 'center', paddingHorizontal: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, height: 40, marginBottom: spacing.lg },
  logo: { width: 32, height: 32, borderRadius: radius.sm + 1, alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: 32, height: 32, borderRadius: radius.sm + 1 },
  ac: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: web.border, backgroundColor: colors.surface },
  nav: { paddingHorizontal: spacing.md, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.md },
  itemRail: { justifyContent: 'center', paddingHorizontal: 0, width: 48, alignSelf: 'center' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  badgeRail: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4 },
  itemOn: { backgroundColor: web.navActive },
  foot: { borderTopWidth: 1, borderTopColor: web.border, paddingTop: spacing.md, paddingHorizontal: spacing.md, gap: spacing.sm },
  langRow: { flexDirection: 'row', padding: 2, borderRadius: radius.md, backgroundColor: colors.fill },
  lang: { flex: 1, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  langOn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: web.border },
  user: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 4, paddingTop: 4 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  confirm: { paddingHorizontal: 4 },
  flex: { flex: 1, minWidth: 0 },
  main: { flex: 1, minWidth: 0 },
}));
