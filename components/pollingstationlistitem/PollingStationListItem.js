import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { THEME } from '../../theme';

export default function PollingStationListItem({
  id,
  uniqueId,
  name,
  role,
  pollingStationId,
  pollingStationPartNo,
  pollingStationName,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {!!role && <Text style={styles.badge}>{role}</Text>}
        {!!pollingStationName && (
          <Text style={styles.secondary} numberOfLines={1}>{pollingStationName}</Text>
        )}
        {!!pollingStationPartNo && (
          <Text style={styles.part}>#{pollingStationPartNo}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.SPACING.XS,
    borderRadius: THEME.BORDER_RADIUS.MD,
    backgroundColor: THEME.COLOR.SURFACE,
    overflow: 'hidden',
    ...THEME.SHADOW.LIGHT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.SM,
    minHeight: 48,
    gap: THEME.SPACING.SM,
  },
  name: {
    flex: 2,
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_PRIMARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  badge: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.PRIMARY,
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND,
    paddingHorizontal: THEME.SPACING.SM,
    paddingVertical: 2,
    borderRadius: THEME.BORDER_RADIUS.SM,
    overflow: 'hidden',
  },
  secondary: {
    flex: 2,
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.TEXT_SECONDARY,
  },
  part: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.TEXT_MUTED,
    minWidth: 32,
    textAlign: 'right',
  },
});
