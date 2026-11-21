/**
 * Full-screen camera that reads the team QR (spec usability-r2 J1). Phones only (the website types the code).
 * Asks for the camera when opened; anything that is not a team code is ignored with a short hint.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Icon } from '@/design/components';
import { colors, radius, spacing } from '@/design/tokens';
import { codeFromScan } from './joinCode';

export function QrScanner({ visible, onClose, onCode }: { visible: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [perm, request] = useCameraPermissions();
  const [hint, setHint] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!visible) return;
    done.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the hint each time the scanner opens
    setHint(null);
    if (perm && !perm.granted && perm.canAskAgain) void request();
  }, [visible, perm, request]);

  const onScan = ({ data }: { data: string }) => {
    if (done.current) return;
    const code = codeFromScan(data);
    if (!code) return setHint(t('qr.notTeam'));
    done.current = true;
    onCode(code);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={s.bar}>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={s.cancel}>
            <AppText variant="body" color={colors.textOnAccent}>{t('common.cancel')}</AppText>
          </Pressable>
          <AppText variant="headline" color={colors.textOnAccent}>{t('qr.scanTitle')}</AppText>
          <View style={s.cancel} />
        </View>
        {perm?.granted ? (
          <View style={s.camWrap}>
            <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
            <View style={s.frame} pointerEvents="none" />
            <View style={s.tip} pointerEvents="none">
              <AppText variant="headline" color={colors.textOnAccent} align="center">{hint ?? t('qr.point')}</AppText>
            </View>
          </View>
        ) : (
          <View style={s.denied}>
            <Icon name="camera-outline" size={44} color={colors.textOnAccent} />
            <AppText variant="body" color={colors.textOnAccent} align="center">{t('qr.cameraOff')}</AppText>
            {perm && !perm.canAskAgain ? (
              <Button label={t('qr.openSettings')} onPress={() => void Linking.openSettings()} />
            ) : (
              <Button label={t('qr.allowCamera')} onPress={() => void request()} />
            )}
          </View>
        )}
        <View style={s.foot}>
          <Button block kind="tinted" label={t('qr.typeInstead')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cameraBg },
  bar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  cancel: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  camWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  frame: { width: 240, height: 240, borderRadius: radius.lg + 8, borderWidth: 4, borderColor: colors.textOnAccent },
  tip: { position: 'absolute', bottom: spacing.xxl, left: spacing.xl, right: spacing.xl },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxl },
  foot: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
