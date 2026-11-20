import { Pressable, StyleSheet, View } from 'react-native';
import { useActiveMembership } from '@/stores/session';
import { useTranslation } from 'react-i18next';
import type { GroupCode } from '@/api/types';
import { syncNow } from '@/features/data';
import { useSyncStatus } from '@/features/sync/SyncStatus';
import { initI18n, isLang, LANG_LABEL, LANG_MARK, LANGS } from '@/i18n';
import { usePrefs } from '@/stores/prefs';
import { useShell } from '../shellContext';
import { colors, group, radius, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Spec sync-modes S8: Synced / Saving… / Offline · N waiting / Next sync in N min / Offline mode / N need attention. Tap = Sync now. */
export function SyncPill() {
  const { t } = useTranslation();
  const st = useSyncStatus();
  const tone = {
    ok: { fg: colors.successText, bg: colors.successTint, icon: 'checkmark' },
    busy: { fg: colors.successText, bg: colors.successTint, icon: 'sync' },
    wait: { fg: colors.warning, bg: colors.dangerTint, icon: 'cloud-offline-outline' },
    warn: { fg: colors.danger, bg: colors.dangerTint, icon: 'alert-circle' },
  }[st.tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('sync.a11y', { status: st.label })}
      onPress={() => void syncNow()}
      style={[s.pill, { backgroundColor: tone.bg }]}
    >
      <Icon name={tone.icon} size={14} color={tone.fg} />
      <AppText variant="footnote" weight="semibold" color={tone.fg} numberOfLines={1}>
        {st.label}
      </AppText>
    </Pressable>
  );
}

/** ਪੰ / हि / A language switch: each tap moves to the next language; the active script is dark (spec bilingual-roll L4). */
export function LangPill() {
  const { t, i18n } = useTranslation();
  const setLang = usePrefs((s) => s.setLang);
  const inShell = !!useShell();
  const allowed = useActiveMembership()?.look?.languages;
  const langs = LANGS.filter((l) => !allowed || allowed.includes(l));
  const cur = isLang(i18n.language) ? i18n.language : 'en';
  const toggle = () => {
    const next = langs[(langs.indexOf(cur) + 1) % langs.length];
    setLang(next);
    void initI18n(next);
  };
  if (inShell) return null; // the web sidebar has its own language switch
  if (langs.length < 2) return null; // C4: one language for this team
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${t('common.switchLangA11y')}: ${LANG_LABEL[cur]}`} onPress={toggle}
      style={[s.pill, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator, minWidth: 60, justifyContent: 'center' }]}>
      {langs.map((l, i) => (
        <AppText key={l} variant="callout" weight={l === cur ? 'bold' : 'regular'} color={l === cur ? colors.text : colors.textSecondary}>
          {`${i ? '/ ' : ''}${LANG_MARK[l]}`}
        </AppText>
      ))}
    </Pressable>
  );
}

/** Group label with its colour dot (colour + word, never colour alone). */
export function GroupTag({ code, label }: { code?: GroupCode; label: string }) {
  const tone = code ? group[code] : group.none;
  return (
    <View style={s.tag}>
      <View style={[s.dot, { backgroundColor: code ? tone.strong : colors.notMetDot }]} />
      <AppText variant="callout" weight="semibold" color={tone.strong}>
        {label}
      </AppText>
    </View>
  );
}

export function SnoBadge({ sno, size = 44 }: { sno: number; size?: number }) {
  return (
    <View style={[s.sno, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText variant="footnote" weight="semibold" color={colors.textSecondary} tabular style={{ fontSize: size > 48 ? 19 : 16 }}>
        {sno}
      </AppText>
    </View>
  );
}

export function ProgressBar({ value, color = colors.accent, label }: { value: number; color?: string; label?: string }) {
  return (
    <View style={s.track} accessibilityRole="progressbar" accessibilityLabel={label ?? `${Math.round(value * 100)}%`} accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <View style={[s.fillBar, { width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: color }]} />
    </View>
  );
}

const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: spacing.md, borderRadius: radius.full },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  sno: { backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.ringTrack, overflow: 'hidden' },
  fillBar: { height: 6, borderRadius: 3 },
});
