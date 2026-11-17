import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Checkbox, Button, ActivityIndicator, Text, IconButton } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { setVoterApproached, setVoterVoted } from '../../storemanagement/votersapproached/VotersApproachedSaga';
import { GENDERS, RELIGIONS, USER_ROLE, VOTER_OPINION } from '../../constant';
import { THEME } from '../../theme';
import {
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetFlatList
} from '@gorhom/bottom-sheet';
import { STRINGS } from '../../strings';

const MOBILE_NUMBER_TYPE = {
  ELVOTE: 'elvote',
  COLLECTED: 'collected'
}

export default function LiveVotingVoterListItem({ 
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
  voterMigrated,
  voterOpinion,
  voterVoted,
  onAddVoterVoted,
}) {
  const dispatch = useDispatch();

  const [expanded, setExpanded] = useState(false);
  const [checked, setChecked] = useState(voterVoted === true ? true : false);
  const [checkedMigrated, setCheckedMigrated] = useState(voterMigrated === true ? true : false);
  const [loading, setLoading] = useState(false);

  const [mobileNumber, setMobileNumber] = useState(voterMobileNumber);
  const [opinion, setOpinion] = useState(voterOpinion);

  const bottomSheetModalRef = useRef(null);

  const selectedMobileType = useRef(null);

  // variables
  const snapPoints = useMemo(() => ['25%'], []);

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleClosePress = () => bottomSheetModalRef.current.close()

  useEffect(() => {
    setExpanded(false);
    setChecked(voterVoted === true ? true : false);
    setCheckedMigrated(voterMigrated === true ? true : false);
    setLoading(false);
    setMobileNumber(voterMobileNumber);
    setOpinion(voterOpinion);
  }, [id])

  const handleCheckboxPress = () => {
    setLoading(true);
    dispatch(setVoterVoted({
      voterId: id, 
      onSuccess: (liveVotingId) => {
        onAddVoterVoted(checked ? null : liveVotingId)
        setChecked(!checked);
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

  return (
    <>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.container}>
        <View style={styles.overlayContainer}>
          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}
          <View style={[
            styles.row, 
            loading && styles.translucent, 
            {
              backgroundColor: opinion === VOTER_OPINION.P.VAL
                ? THEME.COLOR.SUCCESS_BACKGROUND
                : opinion === VOTER_OPINION.N.VAL
                  ? THEME.COLOR.DANGER_BACKGROUND
                  : opinion === VOTER_OPINION.U.VAL
                    ? THEME.COLOR.NEUTRAL_BACKGROUND
                    : '#FFF'
            }
          ]}>
            <Checkbox
              status={checked ? 'checked' : 'unchecked'}
              onPress={handleCheckboxPress}
              disabled={myRole === USER_ROLE.ADMIN}
            />
            <Text style={[
              styles.snotext
            ]}>{sno}</Text>
            <Text variant='titleLarge' style={[styles.text, styles.bold]}>{name}</Text>
            <Text style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_LIST_RELATIVE}:</Text> {relativeName}</Text>
                
            <Text variant='bodyLarge' style={styles.text}>
              <Text><Text style={styles.bold}>{STRINGS.VOTER_LIST_AGE}:</Text> {age}</Text>
              <Text>   |   </Text>
              <Text><Text style={styles.bold}>{STRINGS.VOTER_LIST_GENDER}:</Text> {GENDERS?.[gender]?.LABEL ?? 'NA'}</Text>
              
            </Text>
          
            {expanded && (
              <>
                <View style={{marginTop: 20}}></View>
                <Text style={styles.text} selectable><Text style={styles.bold}>{STRINGS.VOTER_LIST_EPIC}:</Text> <Text>{epicNo}</Text></Text>
                <Text variant='bodyLarge' style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_LIST_ADDRESS}:</Text> {address}</Text>
                <Text style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_LIST_RELATION}:</Text> {relativeRelation}</Text>
                
                {mobileNumber && <View style={styles.mobileRow}>
                  <Text style={styles.textHeading}>{STRINGS.VOTER_LIST_MOBILE}:</Text>
                  <Button
                    mode='text'
                    onPress={() => {
                      selectedMobileType.current = MOBILE_NUMBER_TYPE.COLLECTED;
                      handlePresentModalPress()
                    }}
                  >{mobileNumber}</Button>
                </View>}

                {mobileNumberElvote && <View style={styles.mobileRow}>
                  <Text style={styles.textHeading}>{STRINGS.VOTER_LIST_MOBILE_BY_ELVOTE}:</Text>
                  <Button
                    mode='text'
                    onPress={() => {
                      selectedMobileType.current = MOBILE_NUMBER_TYPE.ELVOTE;
                      handlePresentModalPress()
                    }}
                  >{mobileNumberElvote}</Button>
                </View>}
                
                <Text style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_LIST_CASTE}:</Text> {caste ?? 'NA'}</Text>
                <Text style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_LIST_RELIGION}:</Text> {RELIGIONS?.[religion]?.LABEL ?? 'NA'}</Text>

                <Text style={styles.text}><Text style={styles.bold}>{STRINGS.VOTER_LIST_MIGRATORY_STATUS}:</Text> {checkedMigrated ? STRINGS.VOTER_LIST_MIGRATED : STRINGS.VOTER_LIST_NOT_MIGRATED}</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
        
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enableDismissOnClose={true}
        style={{backgroundColor: THEME.COLOR.PRIMARY}}
        backgroundComponent={() => <View></View>}
      >
        <BottomSheetScrollView>
          <View style={styles.iconContainer}>
            <View style={{alignItems: 'center'}}>
              <IconButton
                icon="whatsapp"
                iconColor={'#075E54'}
                size={60}
                onPress={onPressWhatsapp}
                style={{backgroundColor: 'rgba(255,255,255,0.8)'}}
              />
              <Text style={{color: THEME.COLOR.PRIMARY_FOREGROUND}}>{STRINGS.VOTER_LIST_WHATSAPP_BUTTON}</Text>
            </View>
            <View style={{alignItems: 'center'}}>
              <IconButton
                icon="phone"
                iconColor={'#64A639'}
                size={60}
                onPress={onPressCall}
                style={{backgroundColor: 'rgba(255,255,255,0.8)'}}
              />
              <Text style={{color: THEME.COLOR.PRIMARY_FOREGROUND}}>{STRINGS.VOTER_LIST_CALL_BUTTON}</Text>
            </View>
            
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 5,
    elevation: 2,
    marginHorizontal: 16
  },
  overlayContainer: {
    position: 'relative',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  translucent: {
    opacity: 0.5,
  },
  row: {
    // flexDirection: 'row',
    // alignItems: 'center',
    padding: 10,
  },
  snotext: {
    position: 'absolute',
    top: -8,
    left: -5,
    backgroundColor: '#ccc',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: 'bold'
  },
  rowPrint: {
    borderTopWidth: 1,
    borderTopColor: 'black',
    marginTop: 10,
    paddingTop: 10
  },
  right: {
    justifyContent: 'flex-end'
  },
  bold: {
    fontWeight: 'bold'
  },
  text: {
    flex: 1,
    marginHorizontal: 5,
    gap: 10
  },
  details: {
    paddingLeft: 40,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly'
  },
  contentContainer: {
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND
  },
  bottomSheet: {
    backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND
  },
  mobileRow: {
    marginHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center'
  },
});
