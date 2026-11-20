import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi } from '@/api/adminApi';
import { AppText, Button, Field, Group, LargeTitle, Row, Screen } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useSession } from '@/stores/session';

/** Super-admins can add other super-admins; the last one can't be removed (server rule). */
export default function SuperAdmins() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const meId = useSession((s) => s.me?.user.id);
  const q = useQuery({ queryKey: ['superAdmins'], queryFn: platformApi.superAdmins });
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['superAdmins'] });
  return (
    <Screen width="medium" back={t('platform.title')}>
      <LargeTitle title={t('platform.superAdmins')} />
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <Group>
          {q.data.map((a, i) => (
            <Row key={a.userId} title={a.name} subtitle={`+91 ${a.mobile}`} last={i === q.data.length - 1}
              trailing={a.userId !== meId ? <Button kind="plain" compact label={t('platform.remove')} onPress={() => void platformApi.removeSuperAdmin(a.userId).then(refresh, (e: Error) => setMsg(e.message))} /> : null} />
          ))}
        </Group>
      )}
      <Group header={t('platform.addSuper')}>
        <View style={s.form}>
          <Field label={t('platform.name')} value={name} onChangeText={setName} />
          <Field label={t('platform.mobile')} prefix="+91" value={mobile} keyboardType="number-pad" onChangeText={(x) => setMobile(x.replace(/\D/g, '').slice(0, 10))} />
          {msg ? <AppText variant="callout" color={colors.danger}>{msg}</AppText> : null}
          <Button label={t('platform.addSuper')} disabled={name.trim().length < 2 || mobile.length !== 10}
            onPress={() => void platformApi.addSuperAdmin(mobile, name.trim()).then(() => { setName(''); setMobile(''); refresh(); }, (e: Error) => setMsg(e.message))} />
        </View>
      </Group>
    </Screen>
  );
}

const s = StyleSheet.create({ form: { padding: spacing.lg, gap: spacing.md } });
