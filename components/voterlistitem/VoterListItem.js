import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, TouchableOpacity, View, Pressable } from 'react-native';
import { Checkbox, Button, ActivityIndicator, Text, IconButton, Icon } from 'react-native-paper';
import MobileNumberPopup from '../mobilenumberpopup/MobileNumberPopup';
import OpinionPopup from '../opinionpopup/OpinionPopup';
import { useDispatch, useSelector } from 'react-redux';
import { setVoterApproached, setVoterMigrated } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { GENDERS, RELIGIONS, USER_ROLE, VOTER_OPINION } from '../../constant';
import { THEME } from '../../theme';
import {
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetFlatList
} from '@gorhom/bottom-sheet';
import VoterListSlipPrint from '../voterlistslip/VoterListSlipPrint';
import { STRINGS } from '../../strings';
import MigratoryStatusPopup from '../migratorystatuspopup/MigratoryStatusPopup';
import useResponsive from '../../utils/hooks/useResponsive';

const MOBILE_NUMBER_TYPE = {
  ELVOTE: 'elvote',
  COLLECTED: 'collected'
}

export default function VoterListItem({ 
  myRole,
  id,
  sno,
  name,
  age,
  gender,
  relativeName,
  relativeRelation,
  epicNo,
  address,
  caste,
  religion,
  mobileNumberElvote,
  voterMobileNumber,
  onAddVoterMobileNumber,
  filterSameAddressVoters,
  voterOpinion,
  onAddVoterOpinion,
  voterApproached,
  onAddVoterApproached,
  voterMigrated,
  onAddVoterMigrated,
  pollingStationName,
  pollingStationAddress,
  partNo,
  leaderName,
  ballotNo,
  images,
}) {
  const dispatch = useDispatch();
  const { responsiveValue } = useResponsive();

  const [expanded, setExpanded] = useState(false);
  const [checked, setChecked] = useState(voterApproached === true ? true : false);
  const [checkedMigrated, setCheckedMigrated] = useState(voterMigrated === true ? true : false);
  const [loading, setLoading] = useState(false);

  const [isMobilePopupVisible, setIsMobilePopupVisible] = useState(false);
  const [isOpinionPopupVisible, setIsOpinionPopupVisible] = useState(false);
  const [isMigratoryStatusPopupVisible, setIsMigratoryStatusPopupVisible] = useState(false);
  const [isContactSheetMounted, setIsContactSheetMounted] = useState(false);
  const [mobileNumber, setMobileNumber] = useState(voterMobileNumber);
  const [opinion, setOpinion] = useState(voterOpinion);

  const bottomSheetModalRef = useRef(null);

  const selectedMobileType = useRef(null);

  // variables
  const snapPoints = useMemo(() => ['25%'], []);

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    setIsContactSheetMounted(true);
  }, []);

  const handleClosePress = () => bottomSheetModalRef.current?.close();

  useEffect(() => {
    if (isContactSheetMounted) {
      bottomSheetModalRef.current?.present();
    }
  }, [isContactSheetMounted]);

  useEffect(() => {
    setExpanded(false);
    setChecked(voterApproached === true ? true : false);
    setCheckedMigrated(voterMigrated === true ? true : false);
    setLoading(false);
    setIsMobilePopupVisible(false);
    setIsOpinionPopupVisible(false);
    setIsContactSheetMounted(false);
    setMobileNumber(voterMobileNumber);
    setOpinion(voterOpinion);
  }, [id])

  const handleCheckboxPress = () => {
    setLoading(true);
    dispatch(setVoterApproached({
      voterId: id, 
      onSuccess: (dataCollectionId) => {
        setChecked(true);
        onAddVoterApproached(dataCollectionId)
      }, 
      onComplete: () => {
        setLoading(false);
      }
    }));
  };

  const onPressWhatsapp = () => {
    const mob = selectedMobileType.current === MOBILE_NUMBER_TYPE.COLLECTED ? mobileNumber : mobileNumberElvote;
    let url = `https://wa.me/91${mob.replace(/\s+/g, '').substring(mob.length - 10)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        return Linking.openURL(url);
      })
      .catch((err) => console.error('Error opening WhatsApp', err));
    handleClosePress();
  }

  const onPressCall = () => {
    const mob = selectedMobileType.current === MOBILE_NUMBER_TYPE.COLLECTED ? mobileNumber : mobileNumberElvote;
    let url = `tel:${mob.replace(/\s+/g, '')}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        return Linking.openURL(url);
      })
      .catch((err) => console.error('Error opening dialer', err));
    handleClosePress();
  }

  const toggleExpand = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const opinionStyle = useMemo(() => {
    if (opinion === VOTER_OPINION.P.VAL) return { bg: THEME.COLOR.SUCCESS_BACKGROUND, border: THEME.COLOR.SUCCESS, badgeBg: THEME.COLOR.SUCCESS };
    if (opinion === VOTER_OPINION.N.VAL) return { bg: THEME.COLOR.DANGER_BACKGROUND, border: THEME.COLOR.DANGER, badgeBg: THEME.COLOR.DANGER };
    if (opinion === VOTER_OPINION.U.VAL) return { bg: THEME.COLOR.WARNING_BACKGROUND, border: THEME.COLOR.WARNING, badgeBg: THEME.COLOR.WARNING };
    return { bg: THEME.COLOR.SURFACE, border: THEME.COLOR.BORDER_LIGHT, badgeBg: THEME.COLOR.TEXT_MUTED };
  }, [opinion]);

  return (
    <>
    <Pressable
      onPress={toggleExpand}
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: THEME.OPACITY.PRESSED },
      ]}
    >
      {/* Opinion accent left border */}
      <View style={[styles.accentBorder, { backgroundColor: opinionStyle.border }]} />

      <View style={styles.overlayContainer}>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={THEME.COLOR.PRIMARY} />
          </View>
        )}
        <View style={[
          styles.row, 
          loading && styles.translucent, 
          {
            backgroundColor: opinionStyle.bg,
            maxWidth: responsiveValue('100%', 720, 800),
            alignSelf: 'center',
            width: '100%',
          }
        ]}>
          {/* Header row: Checkbox + Name + Serial badge */}
          <View style={styles.headerRow}>
            {myRole === USER_ROLE.VOLUNTEER && (
              <View style={styles.checkboxWrap}>
                <Checkbox
                  status={checked ? 'checked' : 'unchecked'}
                  onPress={handleCheckboxPress}
                  color={THEME.COLOR.PRIMARY}
                />
              </View>
            )}
            <View style={styles.nameSection}>
              <Text variant='titleMedium' style={styles.nameText}>{name}</Text>
              <Text style={styles.relativeText}>
                {STRINGS.VOTER_LIST_RELATIVE}: {relativeName}
              </Text>
            </View>
            {/* Serial Badge & Opinion Icon */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: THEME.SPACING.XS }}>
              {opinion && opinion !== VOTER_OPINION.O.VAL && (
                <Icon
                  source={
                    opinion === VOTER_OPINION.P.VAL ? 'thumb-up' :
                    opinion === VOTER_OPINION.N.VAL ? 'thumb-down' :
                    'help-circle'
                  }
                  size={16}
                  color={opinionStyle.border}
                />
              )}
              <View style={[styles.serialBadge, { backgroundColor: opinionStyle.badgeBg }]}>
                <Text style={styles.serialText}>{sno}</Text>
              </View>
            </View>
          </View>

          {/* Info pills row */}
          <View style={styles.pillsRow}>
            <View style={styles.infoPill}>
              <Icon source="calendar" size={12} color={THEME.COLOR.TEXT_SECONDARY} />
              <Text style={styles.pillText}>{age} yrs</Text>
            </View>
            <View style={styles.infoPill}>
              <Icon source="account" size={12} color={THEME.COLOR.TEXT_SECONDARY} />
              <Text style={styles.pillText}>{GENDERS?.[gender]?.LABEL ?? 'NA'}</Text>
            </View>
            {mobileNumber && (
              <View style={[styles.infoPill, { backgroundColor: THEME.COLOR.SUCCESS_BACKGROUND }]}>
                <Icon source="phone" size={12} color={THEME.COLOR.SUCCESS} />
                <Text style={[styles.pillText, { color: THEME.COLOR.SUCCESS }]}>Mobile</Text>
              </View>
            )}
            {checked && (
              <View style={[styles.infoPill, { backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND }]}>
                <Icon source="check-circle" size={12} color={THEME.COLOR.PRIMARY} />
                <Text style={[styles.pillText, { color: THEME.COLOR.PRIMARY }]}>Contacted</Text>
              </View>
            )}
          </View>
        
          {expanded && (
            <View style={styles.expandedDetails}>
              <View style={styles.divider} />
              
              {/* Detail rows */}
              <View style={styles.detailGrid}>
                <DetailRow label={STRINGS.VOTER_LIST_EPIC} value={epicNo} selectable />
                <DetailRow label={STRINGS.VOTER_LIST_ADDRESS} value={address} />
                <DetailRow label={STRINGS.VOTER_LIST_RELATION} value={relativeRelation} />
                <DetailRow label={STRINGS.VOTER_LIST_CASTE} value={caste ?? 'NA'} />
                <DetailRow label={STRINGS.VOTER_LIST_RELIGION} value={RELIGIONS?.[religion]?.LABEL ?? 'NA'} />
                <DetailRow 
                  label={STRINGS.VOTER_LIST_MIGRATORY_STATUS} 
                  value={checkedMigrated ? STRINGS.VOTER_LIST_MIGRATED : STRINGS.VOTER_LIST_NOT_MIGRATED} 
                />
              </View>

              {/* Mobile Numbers */}
              {mobileNumber && (
                <View style={styles.mobileRow}>
                  <Icon source="phone" size={16} color={THEME.COLOR.PRIMARY} />
                  <Text style={styles.mobileLabel}>{STRINGS.VOTER_LIST_MOBILE}:</Text>
                  <Button
                    mode='text'
                    compact
                    onPress={() => {
                      selectedMobileType.current = MOBILE_NUMBER_TYPE.COLLECTED;
                      handlePresentModalPress()
                    }}
                    labelStyle={styles.mobileButtonLabel}
                  >{mobileNumber}</Button>
                </View>
              )}

              {mobileNumberElvote && (
                <View style={styles.mobileRow}>
                  <Icon source="phone-classic" size={16} color={THEME.COLOR.TEXT_SECONDARY} />
                  <Text style={styles.mobileLabel}>{STRINGS.VOTER_LIST_MOBILE_BY_ELVOTE}:</Text>
                  <Button
                    mode='text'
                    compact
                    onPress={() => {
                      selectedMobileType.current = MOBILE_NUMBER_TYPE.ELVOTE;
                      handlePresentModalPress()
                    }}
                    labelStyle={styles.mobileButtonLabel}
                  >{mobileNumberElvote}</Button>
                </View>
              )}
              
              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                {!mobileNumber && myRole === USER_ROLE.VOLUNTEER && (
                  <ActionButton 
                    icon="cellphone" 
                    label={STRINGS.VOTER_LIST_ADD_MOBILE_NUMBER_BUTTON} 
                    onPress={() => setIsMobilePopupVisible(true)} 
                    disabled={!checked} 
                  />
                )}
                {(!opinion || opinion === VOTER_OPINION.O.VAL) && myRole === USER_ROLE.VOLUNTEER && (
                  <ActionButton 
                    icon="emoticon-outline" 
                    label={STRINGS.VOTER_LIST_ADD_OPINION_BUTTON} 
                    onPress={() => setIsOpinionPopupVisible(true)} 
                    disabled={!checked} 
                  />
                )}
                {myRole === USER_ROLE.VOLUNTEER && (
                  <ActionButton 
                    icon="file-document-outline" 
                    label={STRINGS.VOTER_LIST_ADD_PDA_VOTER_BUTTON} 
                    onPress={() => {}} 
                    disabled={true} 
                  />
                )}
                {myRole === USER_ROLE.VOLUNTEER && (
                  <ActionButton 
                    icon="airplane" 
                    label={STRINGS.VOTER_LIST_CHANGE_MIGRATORY_STATUS_BUTTON} 
                    onPress={() => setIsMigratoryStatusPopupVisible(true)} 
                    disabled={!checked} 
                  />
                )}
                {address && (
                  <ActionButton 
                    icon="home-search" 
                    label={STRINGS.VOTER_LIST_CHECK_SAME_ADDRESS_VOTERS_BUTTON} 
                    onPress={() => filterSameAddressVoters()} 
                  />
                )}
              </View>

              <View style={[styles.printSection]}>
                <VoterListSlipPrint
                  sno={sno}
                  name={name}
                  age={age}
                  gender={gender}
                  relativeName={relativeName}
                  epicNo={epicNo}
                  address={address}
                  pollingStationName={pollingStationName}
                  pollingStationAddress={pollingStationAddress}
                  partNo={partNo}
                  leaderName={leaderName}
                  ballotNo={ballotNo}
                  images={images}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Expand indicator */}
      <View style={styles.expandIndicator}>
        <Icon 
          source={expanded ? 'chevron-up' : 'chevron-down'} 
          size={16} 
          color={THEME.COLOR.TEXT_MUTED} 
        />
      </View>
    </Pressable>

    {myRole === USER_ROLE.VOLUNTEER && isMobilePopupVisible && (
      <MobileNumberPopup
        voterId={id}
        visible={isMobilePopupVisible}
        onClose={() => setIsMobilePopupVisible(false)}
        onValue={(value) => {
          setMobileNumber(value);
          onAddVoterMobileNumber(value);
        }}
      />
    )}
    {myRole === USER_ROLE.VOLUNTEER && isOpinionPopupVisible && (
      <OpinionPopup
        voterId={id}
        visible={isOpinionPopupVisible}
        onClose={() => setIsOpinionPopupVisible(false)}
        onValue={(value) => {
          setOpinion(value);
          onAddVoterOpinion(value);
        }}
      />
    )}
    {myRole === USER_ROLE.VOLUNTEER && isMigratoryStatusPopupVisible && (
      <MigratoryStatusPopup
        voterId={id}
        visible={isMigratoryStatusPopupVisible}
        onClose={() => setIsMigratoryStatusPopupVisible(false)}
        onValue={(value) => {
          setCheckedMigrated(value);
          onAddVoterMigrated(value);
        }}
      />
    )}

      {isContactSheetMounted && (
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={snapPoints}
          enableDismissOnClose={true}
          style={{backgroundColor: THEME.COLOR.PRIMARY}}
          backgroundComponent={() => <View></View>}
          onDismiss={() => setIsContactSheetMounted(false)}
        >
          <BottomSheetScrollView>
            <View style={styles.contactSheet}>
              <Pressable
                onPress={onPressWhatsapp}
                style={({ pressed }) => [styles.contactOption, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.contactIconCircle, { backgroundColor: THEME.COLOR.WHATSAPP_BACKGROUND }]}>
                  <IconButton icon="whatsapp" iconColor={THEME.COLOR.WHATSAPP} size={32} style={{ margin: 0 }} />
                </View>
                <Text style={styles.contactLabel}>{STRINGS.VOTER_LIST_WHATSAPP_BUTTON}</Text>
              </Pressable>
              <Pressable
                onPress={onPressCall}
                style={({ pressed }) => [styles.contactOption, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.contactIconCircle, { backgroundColor: THEME.COLOR.WHATSAPP_BACKGROUND }]}>
                  <IconButton icon="phone" iconColor={THEME.COLOR.CALL_COLOR} size={32} style={{ margin: 0 }} />
                </View>
                <Text style={styles.contactLabel}>{STRINGS.VOTER_LIST_CALL_BUTTON}</Text>
              </Pressable>
            </View>
          </BottomSheetScrollView>
        </BottomSheetModal>
      )}
    </>
  );
}

// Sub-components
function DetailRow({ label, value, selectable = false }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}:</Text>
      <Text style={detailStyles.value} selectable={selectable}>{value}</Text>
    </View>
  );
}

function ActionButton({ icon, label, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        actionStyles.button,
        disabled && actionStyles.disabled,
        pressed && !disabled && { backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND },
      ]}
    >
      <Icon source={icon} size={14} color={disabled ? THEME.COLOR.TEXT_MUTED : THEME.COLOR.PRIMARY} />
      <Text style={[actionStyles.label, disabled && { color: THEME.COLOR.TEXT_MUTED }]}>{label}</Text>
    </Pressable>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: THEME.SPACING.XS,
  },
  label: {
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    fontSize: THEME.FONT_SIZE.SM,
    width: 100,
  },
  value: {
    flex: 1,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontSize: THEME.FONT_SIZE.SM,
  },
});

const actionStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.SPACING.SM,
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.SM,
    backgroundColor: THEME.COLOR.SURFACE_ELEVATED,
    borderRadius: THEME.BORDER_RADIUS.FULL,
    borderWidth: 1,
    borderColor: THEME.COLOR.BORDER,
  },
  disabled: {
    opacity: THEME.OPACITY.DISABLED,
  },
  label: {
    fontSize: THEME.FONT_SIZE.XS,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
    color: THEME.COLOR.PRIMARY,
  },
});

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.SPACING.XS,
    marginHorizontal: THEME.SPACING.SM,
    borderRadius: THEME.CARD.BORDER_RADIUS,
    backgroundColor: THEME.COLOR.SURFACE,
    overflow: 'hidden',
    flexDirection: 'row',
    ...THEME.SHADOW.LIGHT,
  },
  accentBorder: {
    width: 4,
  },
  overlayContainer: {
    flex: 1,
    position: 'relative',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: THEME.CARD.BORDER_RADIUS,
  },
  translucent: {
    opacity: 0.5,
  },
  row: {
    padding: THEME.SPACING.LG,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxWrap: {
    marginRight: THEME.SPACING.SM,
  },
  nameSection: {
    flex: 1,
  },
  nameText: {
    fontWeight: THEME.FONT_WEIGHT.BOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    fontSize: THEME.FONT_SIZE.LG,
  },
  relativeText: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.TEXT_SECONDARY,
    marginTop: THEME.SPACING.XXS,
  },
  serialBadge: {
    width: 32,
    height: 32,
    borderRadius: THEME.BORDER_RADIUS.FULL,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.SPACING.SM,
  },
  serialText: {
    color: '#FFF',
    fontSize: THEME.FONT_SIZE.XS,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.SPACING.SM,
    marginTop: THEME.SPACING.MD,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.COLOR.SURFACE_ELEVATED,
    paddingHorizontal: THEME.SPACING.SM,
    paddingVertical: THEME.SPACING.XXS,
    borderRadius: THEME.BORDER_RADIUS.FULL,
  },
  pillText: {
    fontSize: THEME.FONT_SIZE.XS,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  expandedDetails: {
    marginTop: THEME.SPACING.LG,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.COLOR.BORDER,
    marginBottom: THEME.SPACING.MD,
  },
  detailGrid: {
    marginBottom: THEME.SPACING.MD,
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: THEME.SPACING.XS,
    gap: THEME.SPACING.SM,
  },
  mobileLabel: {
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
  },
  mobileButtonLabel: {
    fontSize: THEME.FONT_SIZE.SM,
    color: THEME.COLOR.PRIMARY,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: THEME.SPACING.MD,
    gap: THEME.SPACING.SM,
  },
  printSection: {
    borderTopWidth: 1,
    borderTopColor: THEME.COLOR.BORDER,
    marginTop: THEME.SPACING.LG,
    paddingTop: THEME.SPACING.MD,
    justifyContent: 'flex-end',
  },
  expandIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 0,
    left: 0,
    alignItems: 'center',
  },
  contactSheet: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: THEME.SPACING.LG,
  },
  contactOption: {
    alignItems: 'center',
    gap: THEME.SPACING.SM,
  },
  contactIconCircle: {
    borderRadius: THEME.BORDER_RADIUS.FULL,
    overflow: 'hidden',
  },
  contactLabel: {
    color: THEME.COLOR.PRIMARY_FOREGROUND,
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
});
