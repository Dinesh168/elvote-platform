import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Group, Icon, IconSquare, LargeTitle, Row } from '@/design/components';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { colors } from '@/design/tokens';
import { activate, logout, rolesOf } from '@/features/session/session';
import { useSession } from '@/stores/session';

/** Switch between roles (super-admin, admin of an AC, volunteer). */
export default function Choose() {
  const { t } = useTranslation();
  const me = useSession((s) => s.me);
  const mode = useSession((s) => s.mode);
  const mid = useSession((s) => s.membershipId);
  if (!me) return null;
  const roles = rolesOf(me);
  return (
    <AuthScreen back={t('common.back')}>
      <LargeTitle title={t('auth.chooseRole')} subtitle={me.user.name} />
      <Group>
        {roles.map((r, i) => {
          const m = me.memberships.find((x) => x.id === r.membershipId);
          const title = r.mode === 'platform' ? t('auth.asPlatform') : r.mode === 'admin'
            ? t('auth.asAdmin', { ac: m?.acNo, name: m?.acName })
            : t('auth.asVolunteer', { ac: m?.acNo, booths: m?.booths.join(', ') });
          const on = r.mode === mode && r.membershipId === mid;
          return (
            <Row
              key={`${r.mode}-${r.membershipId}`}
              title={title}
              subtitle={m?.partyName}
              leading={<IconSquare name={r.mode === 'platform' ? 'globe' : r.mode === 'admin' ? 'stats-chart' : 'walk'} bg={r.mode === 'platform' ? colors.text : colors.accent} />}
              trailing={on ? <Icon name="checkmark" size={22} color={colors.accent} /> : null}
              onPress={() => void activate(r).then(() => router.replace(r.path as never))}
              last={i === roles.length - 1}
            />
          );
        })}
      </Group>
      <Group>
        <Row title={t('auth.logout')} titleColor={colors.danger} onPress={() => void logout()} last />
      </Group>
    </AuthScreen>
  );
}
