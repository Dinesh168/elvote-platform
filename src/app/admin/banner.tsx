import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { AppText, Button, Group, Icon, LargeTitle, Row, Screen } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { fileUrl } from '@/features/session/customer';
import { loadMe } from '@/features/session/session';
import { useActiveMembership } from '@/stores/session';

const MAX = 2 * 1024 * 1024;

/**
 * Admin → More → Home banner (spec onboarding-branding OB8): a wide photo shown at the top of Home for the whole team
 * and on the admin's Dashboard. Choose (cropped to 2:1) or take a photo, then Save; or remove it.
 */
export default function BannerScreen() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const current = fileUrl(m?.look?.bannerUrl);
  const [picked, setPicked] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const preview = picked?.uri ?? current;

  const pick = async (camera: boolean) => {
    setMsg(null);
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [2, 1], quality: 0.8 };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setMsg({ ok: false, text: t('banner.cameraDenied') });
    }
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    if (a.fileSize && a.fileSize > MAX) return setMsg({ ok: false, text: t('banner.tooBig') });
    setPicked(a);
  };

  const save = async () => {
    if (!m || !picked) return;
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      const name = picked.fileName ?? 'banner.jpg';
      const type = picked.mimeType ?? 'image/jpeg';
      if (Platform.OS === 'web') form.append('file', await (await fetch(picked.uri)).blob(), name);
      else form.append('file', { uri: picked.uri, name, type } as unknown as Blob);
      await adminApi.uploadBanner(m.id, form);
      await loadMe();
      setPicked(null);
      setMsg({ ok: true, text: t('banner.saved') });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!m) return;
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.removeBanner(m.id);
      await loadMe();
      setPicked(null);
      setConfirmRemove(false);
      setMsg({ ok: true, text: t('banner.removed') });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen width="narrow" back={t('admin.tabs.more')}>
      <LargeTitle title={t('banner.title')} subtitle={m ? t('banner.subtitle', { ac: t('admin.acTitle', { no: m.acNo, name: m.acName }) }) : undefined} />
      <Group header={t('banner.preview')}>
        <View style={s.previewPad}>
          {preview ? (
            <Image source={{ uri: preview }} style={s.preview} resizeMode="cover" accessibilityLabel={t('banner.preview')} />
          ) : (
            <View style={[s.preview, s.empty]}>
              <Icon name="image-outline" size={30} color={colors.textSecondary} />
              <AppText variant="callout" color={colors.textSecondary}>{t('banner.empty')}</AppText>
            </View>
          )}
        </View>
      </Group>
      <Group footer={t('banner.hint')}>
        <Row title={t('banner.choose')} titleColor={colors.accent} leading={<Icon name="images-outline" size={22} color={colors.accent} />} onPress={busy ? undefined : () => void pick(false)} last={Platform.OS === 'web' && !current} />
        {Platform.OS !== 'web' ? (
          <Row title={t('banner.camera')} titleColor={colors.accent} leading={<Icon name="camera-outline" size={22} color={colors.accent} />} onPress={busy ? undefined : () => void pick(true)} last={!current} />
        ) : null}
        {current ? (
          <Row title={confirmRemove ? t('banner.removeConfirm') : t('banner.remove')} titleColor={colors.danger} leading={<Icon name="trash-outline" size={22} color={colors.danger} />}
            onPress={busy ? undefined : () => (confirmRemove ? void remove() : setConfirmRemove(true))} last />
        ) : null}
      </Group>
      {msg ? <AppText variant="callout" color={msg.ok ? colors.successText : colors.danger} style={s.msg}>{msg.text}</AppText> : null}
      <View style={s.pad}>
        <Button block label={t('banner.save')} disabled={!picked || busy} onPress={() => void save()} />
      </View>
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  previewPad: { padding: spacing.md },
  preview: { width: '100%', aspectRatio: 2, borderRadius: radius.md, backgroundColor: colors.fill },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  msg: { paddingHorizontal: spacing.xl },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
}));
