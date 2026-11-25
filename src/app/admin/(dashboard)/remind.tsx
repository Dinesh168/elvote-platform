import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type RemindTemplate } from '@/api/adminApi';
import { AppText, Button, Group, Icon, LargeTitle, Row, Screen } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';

const TEMPLATES: { key: RemindTemplate; icon: string; color: string }[] = [
  { key: 'booth_needs_you', icon: 'home', color: colors.accent },
  { key: 'days_left', icon: 'time', color: colors.danger },
  { key: 'call_me', icon: 'call', color: colors.success },
];

/**
 * Admin → Dashboard → Quiet volunteers (spec map-trend Q1): volunteers with no meeting for 3+ days. Untick anyone,
 * pick a ready message, send one phone alert to all. Each volunteer can be reminded once in 12 hours.
 */
export default function RemindScreen() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const q = useQuery({ queryKey: ['dashboard', mid, '', 0], queryFn: () => adminApi.dashboard(mid), enabled: !!mid });
  const quiet = q.data?.quiet ?? [];
  const [off, setOff] = useState<Set<string>>(new Set());
  const [tpl, setTpl] = useState<RemindTemplate>('booth_needs_you');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const chosen = quiet.filter((v) => !off.has(v.userId));
  const toggle = (id: string) => setOff((s0) => { const n = new Set(s0); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const send = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await adminApi.remind(mid, chosen.map((v) => v.userId), tpl);
      setMsg({ ok: true, text: t('remind.sent', { count: r.sent }) + (r.skipped ? ` ${t('remind.skipped', { count: r.skipped })}` : '') });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back={t('admin.tabs.dashboard')}>
      <LargeTitle title={t('remind.title', { count: quiet.length })} subtitle={t('remind.sub')} />
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} />
      ) : !quiet.length ? (
        <AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{t('remind.none')}</AppText>
      ) : (
        <>
          <Group>
            {quiet.map((v, i) => {
              const on = !off.has(v.userId);
              return (
                <Row key={v.userId} title={v.name || t('del.deletedUser')} onPress={() => toggle(v.userId)} last={i === quiet.length - 1}
                  subtitle={`${v.booths.length ? t('common.booth', { no: v.booths.join(', ') }) : ''} · ${v.days === null ? t('remind.never') : t('remind.days', { count: v.days })}`}
                  trailing={<Icon name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? colors.accent : colors.chevron} />}
                  a11yLabel={`${v.name}. ${on ? t('remind.selected') : t('remind.notSelected')}`} />
              );
            })}
          </Group>
          <Group header={t('remind.pick')}>
            <View style={s.tpls} accessibilityRole="radiogroup">
              {TEMPLATES.map((x) => {
                const on = tpl === x.key;
                return (
                  <Pressable key={x.key} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }} aria-checked={on} onPress={() => setTpl(x.key)} style={[s.tpl, on && { borderColor: x.color }]}>
                    <Icon name={x.icon} size={22} color={x.color} />
                    <AppText variant="callout" weight={on ? 'semibold' : undefined} style={s.flex}>{t(`remind.tpl.${x.key}`)}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </Group>
          <View style={s.pad}>
            <Button icon={<Icon name="notifications" size={20} color={colors.textOnAccent} />} label={busy ? t('remind.sending') : t('remind.send', { count: chosen.length })} disabled={!chosen.length || busy} onPress={() => void send()} />
            {msg ? <AppText variant="callout" color={msg.ok ? colors.successText : colors.danger} style={s.msg} accessibilityLiveRegion="polite">{msg.text}</AppText> : null}
          </View>
        </>
      )}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  empty: { padding: spacing.xxxl },
  tpls: { padding: spacing.md, gap: spacing.sm },
  tpl: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.separator },
  flex: { flex: 1 },
  pad: { padding: spacing.lg },
  msg: { marginTop: spacing.md },
}));
