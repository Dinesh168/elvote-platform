/**
 * Side menu (owner decision: tabs + side menu; spec map-trend). Opened from the ☰ button in the top bar of every main
 * page. Every page of the role in one list, each with an icon and a word, grouped by what the person wants to do.
 * Admin and volunteer see only their own pages.
 */
import { router, type Href } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AppText, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { useActiveMembership, useSession } from '@/stores/session';
import { useSignOut } from '@/features/session/useSignOut';

type Item = { href: Href; label: string; icon: string; color: string; feature?: 'poll' | 'tasks' | 'surnames' | 'zones' | 'map' };
type Section = { title: string; items: Item[] };

function sections(role: 'admin' | 'volunteer', t: TFunction): Section[] {
  if (role === 'admin') {
    // spec admin-fixes-r1 A1–A5: Search voter and Zones · areas · booths added; Quiet volunteers and Map removed (Map is a
    // tab; quiet volunteers are on the Dashboard); Zones renamed Zone setup; Sign out at the bottom.
    return [
      { title: t('side.today'), items: [
        { href: '/admin/dashboard', label: t('admin.tabs.dashboard'), icon: 'speedometer', color: colors.accent },
        { href: '/admin/search', label: t('side.search'), icon: 'search', color: colors.accent },
        { href: '/admin/booths-all', label: t('side.places'), icon: 'list', color: colors.success },
        { href: '/admin/team', label: t('admin.tabs.team'), icon: 'people', color: colors.success },
        { href: '/admin/tasks', label: t('admin.tabs.tasks'), icon: 'flag', color: colors.iconTask, feature: 'tasks' },
      ] },
      { title: t('side.win'), items: [
        { href: '/admin/win-plan', label: t('win.title'), icon: 'trophy', color: colors.success },
        { href: '/admin/trend', label: t('trend.title'), icon: 'trending-up', color: colors.warning },
        { href: '/admin/surnames', label: t('asur.title'), icon: 'people-circle', color: colors.iconGender, feature: 'surnames' },
      ] },
      { title: t('side.polling'), items: [
        { href: '/admin/polling', label: t('pd.title'), icon: 'navigate', color: colors.danger },
        { href: '/admin/poll', label: t('admin.poll'), icon: 'checkbox', color: colors.success, feature: 'poll' },
      ] },
      { title: t('side.setup'), items: [
        { href: '/admin/zones', label: t('side.zoneSetup'), icon: 'grid', color: colors.accent, feature: 'zones' },
        { href: '/admin/team-qr', label: t('qr.title'), icon: 'qr-code', color: colors.success },
        { href: '/admin/banner', label: t('banner.title'), icon: 'image', color: colors.accent },
        { href: '/admin/trace', label: t('trace.title'), icon: 'git-commit', color: colors.text },
        { href: '/admin/more', label: t('side.settings'), icon: 'settings', color: colors.textSecondary },
      ] },
    ];
  }
  return [
    { title: t('side.work'), items: [
      { href: '/home', label: t('tabs.home'), icon: 'home', color: colors.accent },
      { href: '/voters', label: t('tabs.voters'), icon: 'people', color: colors.success },
      { href: '/tasks', label: t('tasks.title'), icon: 'flag', color: colors.iconTask, feature: 'tasks' },
      { href: '/surnames', label: t('surnames.title'), icon: 'people-circle', color: colors.iconGender, feature: 'surnames' },
    ] },
    { title: t('side.polling'), items: [
      { href: '/poll', label: t('tabs.poll'), icon: 'checkbox', color: colors.success, feature: 'poll' },
      { href: '/call-list', label: t('call.row'), icon: 'call', color: colors.success, feature: 'poll' },
    ] },
    { title: t('side.me'), items: [
      { href: '/me', label: t('tabs.me'), icon: 'person-circle', color: colors.accent },
      { href: '/language', label: t('side.language'), icon: 'language', color: colors.textSecondary },
    ] },
  ];
}

export function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const m = useActiveMembership();
  const name = useSession((s) => s.me?.user.name) ?? '';
  const signOut = useSignOut();
  if (!m) return null;
  const on = (f?: Item['feature']) => !f || m.features?.[f] !== false;
  const go = (href: Href) => { onClose(); router.push(href); };
  return (
    <>
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={[s.panel, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]} accessibilityViewIsModal>
          <View style={s.head}>
            {/* spec admin-fixes-r1 A5: the admin's name opens My profile. */}
            <Pressable style={s.flex} disabled={m.role !== 'admin'} accessibilityRole={m.role === 'admin' ? 'button' : undefined}
              accessibilityLabel={m.role === 'admin' ? `${t('side.profile')}, ${name}` : undefined} onPress={() => go('/admin/profile')}>
              <AppText variant="headline" numberOfLines={1}>{name}</AppText>
              <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>
                {`${t(m.role === 'admin' ? 'web.roleAdmin' : 'side.volunteer')} · ${m.look?.appName || m.partyName}`}
              </AppText>
              {m.role === 'admin' ? <AppText variant="footnote" weight="semibold" color={colors.accent}>{`${t('side.profile')} ›`}</AppText> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('side.close')} onPress={onClose} hitSlop={10} style={s.close}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.list}>
            {sections(m.role, t).map((sec) => {
              const items = sec.items.filter((i) => on(i.feature));
              if (!items.length) return null;
              return (
                <View key={sec.title} style={s.section}>
                  <AppText variant="caption" weight="semibold" color={colors.textSecondary} style={s.secTitle}>{sec.title.toLocaleUpperCase()}</AppText>
                  {items.map((i) => (
                    <Pressable key={String(i.href)} accessibilityRole="button" accessibilityLabel={i.label} onPress={() => go(i.href)}
                      style={({ pressed }) => [s.item, pressed && { backgroundColor: colors.pressed }]}>
                      <View style={[s.icon, { backgroundColor: i.color }]}><Icon name={i.icon} size={18} color={colors.textOnAccent} /></View>
                      <AppText variant="body" style={s.flex} numberOfLines={1}>{i.label}</AppText>
                    </Pressable>
                  ))}
                </View>
              );
            })}
            {m.role === 'admin' ? (
              <View style={s.section}>
                <Pressable accessibilityRole="button" accessibilityLabel={t('side.signOut')} onPress={() => { onClose(); signOut.ask(); }}
                  style={({ pressed }) => [s.item, pressed && { backgroundColor: colors.pressed }]}>
                  <View style={[s.icon, { backgroundColor: colors.danger }]}><Icon name="log-out-outline" size={18} color={colors.textOnAccent} /></View>
                  <AppText variant="body" color={colors.danger} style={s.flex}>{t('side.signOut')}</AppText>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
        <Pressable style={s.flex} accessibilityRole="button" accessibilityLabel={t('side.close')} onPress={onClose} />
      </View>
    </Modal>
    {signOut.dialog}
    </>
  );
}

const s = themed(() => StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', backgroundColor: colors.scrim },
  panel: { width: '82%', maxWidth: 340, backgroundColor: colors.bg, borderTopRightRadius: radius.lg, borderBottomRightRadius: radius.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  section: { marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.xs },
  secTitle: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md },
  icon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
}));
