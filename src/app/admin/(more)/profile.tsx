/**
 * spec admin-fixes-r1 A5: the admin's own profile (opened from their name at the top of the ☰ menu): name, mobile or
 * e-mail, role, team and assembly (view only), Language, and Sign out (asks first).
 */
import { useTranslation } from 'react-i18next';
import { Group, IconSquare, LargeTitle, Row, Screen } from '@/design/components';
import { colors } from '@/design/tokens';
import { useAllowedLangs } from '@/features/session/customer';
import { useSignOut } from '@/features/session/useSignOut';
import { LanguageRow } from '@/features/shell/LanguageRow';
import { useActiveMembership, useSession } from '@/stores/session';

export default function AdminProfile() {
  const { t } = useTranslation();
  const me = useSession((s) => s.me);
  const m = useActiveMembership();
  const langs = useAllowedLangs();
  const signOut = useSignOut();
  const u = me?.user;
  return (
    <Screen back={t('admin.tabs.dashboard')} width="narrow">
      <LargeTitle title={t('aprofile.title')} subtitle={u?.name} />
      <Group>
        {u?.mobile ? <Row title={t('aprofile.mobile')} value={u.mobile} leading={<IconSquare name="call" bg={colors.success} />} /> : null}
        {u?.email ? <Row title={t('aprofile.email')} value={u.email} leading={<IconSquare name="mail" bg={colors.accent} />} /> : null}
        <Row title={t('aprofile.role')} value={t('web.roleAdmin')} leading={<IconSquare name="shield-checkmark" bg={colors.accent} />} />
        <Row title={t('aprofile.team')} value={m?.look?.appName || m?.partyName || ''} leading={<IconSquare name="people" bg={colors.success} />} />
        <Row title={t('aprofile.ac')} value={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : ''} leading={<IconSquare name="location" bg={colors.warning} />} last />
      </Group>
      <Group>
        <LanguageRow langs={langs} />
      </Group>
      <Group>
        <Row title={t('side.signOut')} titleColor={colors.danger} leading={<IconSquare name="log-out-outline" bg={colors.danger} />} onPress={signOut.ask} last />
      </Group>
      {signOut.dialog}
    </Screen>
  );
}
