import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type VolunteerRequest } from '@/api/adminApi';
import { AppText, Button, Field, Group } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';

/**
 * Volunteer requests of one customer, decided by the super-admin (spec accounts-access AC10).
 * Approve gives the booths the volunteer asked for; reject needs a reason. Hidden when nothing is waiting.
 */
export function VolunteerRequests({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['volRequests', customerId], queryFn: () => platformApi.volunteerRequests(customerId) });
  if (!q.data?.length) return null;
  const done = () => void qc.invalidateQueries({ queryKey: ['volRequests', customerId] });
  return (
    <Group header={t('requests.volunteers', { count: q.data.length })}>
      {q.data.map((r) => <One key={r.membershipId} r={r} customerId={customerId} onDone={done} />)}
    </Group>
  );
}

function One({ r, customerId, onDone }: { r: VolunteerRequest; customerId: string; onDone: () => void }) {
  const { t } = useTranslation();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const act = (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    void fn().then(onDone, (e: Error) => setErr(e.message)).finally(() => setBusy(false));
  };
  return (
    <View style={s.item}>
      <AppText variant="headline">{r.name}</AppText>
      <AppText variant="footnote" color={colors.textSecondary}>
        {[r.mobile ? `+91 ${r.mobile}` : null, r.email, r.booths.length ? t('common.booth', { no: r.booths.join(', ') }) : null].filter(Boolean).join(' · ')}
      </AppText>
      {rejecting ? (
        <Field label={t('requests.reason')} value={reason} onChangeText={setReason} maxLength={200} />
      ) : null}
      {err ? <AppText variant="footnote" color={colors.danger}>{err}</AppText> : null}
      <View style={s.row}>
        {rejecting ? (
          <>
            <Button compact kind="danger" style={s.flex} label={t('requests.reject')} disabled={busy || reason.trim().length < 2}
              onPress={() => act(() => platformApi.rejectVolunteer(customerId, r.membershipId, reason.trim()))} />
            <Button compact kind="plain" label={t('users.cancel')} onPress={() => setRejecting(false)} />
          </>
        ) : (
          <>
            <Button compact kind="success" style={s.flex} label={t('requests.approve')} disabled={busy || !r.booths.length}
              onPress={() => act(() => platformApi.approveVolunteer(customerId, r.membershipId, r.booths))} />
            <Button compact kind="tinted" style={s.flex} label={t('requests.reject')} disabled={busy} onPress={() => setRejecting(true)} />
          </>
        )}
      </View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  item: { gap: spacing.sm, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator, borderRadius: radius.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
}));
