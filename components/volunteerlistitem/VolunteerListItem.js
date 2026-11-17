import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View, Pressable, Linking } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';
import { THEME } from '../../theme';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { STRINGS } from '../../strings';

export default function VolunteerListItem({
  id,
  name,
  role,
  mobile,
  pollingStationPartNo,
  pollingStationName,
  onClick = () => {},
}) {
  const bottomSheetModalRef = useRef(null);
  const snapPoints = useMemo(() => ['25%'], []);

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleClosePress = () => bottomSheetModalRef.current?.close();

  const onPressWhatsapp = () => {
    const cleaned = mobile.replace(/\s+/g, '').slice(-10);
    Linking.openURL(`https://wa.me/91${cleaned}`).catch(() => {});
    handleClosePress();
  };

  const onPressCall = () => {
    Linking.openURL(`tel:${mobile.replace(/\s+/g, '')}`).catch(() => {});
    handleClosePress();
  };

  return (
    <>
      <Pressable
        onPress={onClick}
        style={({ pressed }) => [styles.container, pressed && { opacity: THEME.OPACITY.PRESSED }]}
      >
        <View style={styles.row}>
          <View style={styles.infoBlock}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {!!role && <Text style={styles.meta}>{role}</Text>}
          </View>

          <View style={styles.psBlock}>
            {!!pollingStationName && (
              <Text style={styles.psName} numberOfLines={1}>{pollingStationName}</Text>
            )}
            {!!pollingStationPartNo && (
              <Text style={styles.partNo}>#{pollingStationPartNo}</Text>
            )}
          </View>

          {!!mobile && (
            <Pressable
              onPress={handlePresentModalPress}
              style={({ pressed }) => [styles.mobileButton, pressed && { opacity: THEME.OPACITY.PRESSED }]}
              hitSlop={8}
            >
              <Icon source="phone" size={16} color={THEME.COLOR.PRIMARY} />
              <Text style={styles.mobileText} numberOfLines={1}>{mobile}</Text>
            </Pressable>
          )}
        </View>
      </Pressable>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enableDismissOnClose={true}
        style={{ backgroundColor: THEME.COLOR.PRIMARY }}
        backgroundComponent={() => <View />}
      >
        <BottomSheetScrollView>
          <View style={styles.contactSheet}>
            <Pressable
              onPress={onPressWhatsapp}
              style={({ pressed }) => [styles.contactOption, pressed && { opacity: THEME.OPACITY.PRESSED }]}
            >
              <View style={[styles.contactIconCircle, { backgroundColor: THEME.COLOR.WHATSAPP_BACKGROUND }]}>
                <IconButton icon="whatsapp" iconColor={THEME.COLOR.WHATSAPP} size={32} style={{ margin: 0 }} />
              </View>
              <Text style={styles.contactLabel}>{STRINGS.VOTER_LIST_WHATSAPP_BUTTON}</Text>
            </Pressable>
            <Pressable
              onPress={onPressCall}
              style={({ pressed }) => [styles.contactOption, pressed && { opacity: THEME.OPACITY.PRESSED }]}
            >
              <View style={[styles.contactIconCircle, { backgroundColor: THEME.COLOR.WHATSAPP_BACKGROUND }]}>
                <IconButton icon="phone" iconColor={THEME.COLOR.CALL_COLOR} size={32} style={{ margin: 0 }} />
              </View>
              <Text style={styles.contactLabel}>{STRINGS.VOTER_LIST_CALL_BUTTON}</Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.SPACING.XS,
    borderRadius: THEME.BORDER_RADIUS.MD,
    backgroundColor: THEME.COLOR.SURFACE,
    ...THEME.SHADOW.LIGHT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.SM,
    minHeight: 56,
    gap: THEME.SPACING.SM,
  },
  infoBlock: {
    flex: 2,
  },
  name: {
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
  },
  meta: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.TEXT_SECONDARY,
    marginTop: 2,
  },
  psBlock: {
    flex: 2,
  },
  psName: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.TEXT_SECONDARY,
  },
  partNo: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.TEXT_MUTED,
    marginTop: 2,
  },
  mobileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.SPACING.XS,
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    paddingHorizontal: THEME.SPACING.SM,
    paddingVertical: THEME.SPACING.XS,
    borderRadius: THEME.BORDER_RADIUS.SM,
    flex: 1.5,
  },
  mobileText: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.PRIMARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    flex: 1,
  },
  contactSheet: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: THEME.SPACING.LG,
  },
  contactOption: {
    alignItems: 'center',
    gap: THEME.SPACING.XS,
  },
  contactIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.PRIMARY_FOREGROUND,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
});
