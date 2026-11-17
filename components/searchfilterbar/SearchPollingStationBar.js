import React, { useEffect, useRef, useState } from 'react';
import { Text, Searchbar, IconButton, Badge, Portal, Icon } from 'react-native-paper';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import MultiSelectModal from '../multiselect/MultiSelectModal';
import FlashListCompat from '../ui/FlashListCompat';
import { useGetPollingStations } from '../../utils/hooks/useGetPollingStations';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';
import useResponsive from '../../utils/hooks/useResponsive';

export default function SearchPollingStationBar({onSetPollingStation = () => {}}) {
  const [searchText, setSearchText] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(130);
  const outerContainerRef = useRef(null);
  const { responsiveValue, contentMaxWidth } = useResponsive();
  
  const [pollingStationIds, setPollingStationIds] = useState([])

  const pollingStationIdsCallback = useRef(null);
  
  const pollingStationsList = useGetPollingStations();
  const dispatch = useDispatch();

  const [filteredCompleteList, setFilteredCompleteList] = useState(pollingStationsList);

  useEffect(() => {
    if (pollingStationIdsCallback.current) {
      setOpenModalAndSubmit();
      pollingStationIdsCallback.current = null;
    }
  }, [pollingStationIds, pollingStationIdsCallback])

  const onSearch = (text) => {
    setSearchText(text);
    const textLowerCase = text.toLowerCase();
    const searchList = pollingStationsList.filter(listItem => `${listItem.name} (${STRINGS.PART_NO_LABEL} - ${listItem.part_no})`.toLowerCase().startsWith(textLowerCase));
    const extendedSearchList = pollingStationsList.filter(listItem => `${listItem.name} (${STRINGS.PART_NO_LABEL} - ${listItem.part_no})`.toLowerCase().indexOf(textLowerCase) > -1 && !searchList.find(sL => sL.name === listItem.name));
    setFilteredCompleteList([...searchList, ...extendedSearchList])
  }

  useEffect(() => {
    if (pollingStationsList.length > 0) {
      setFilteredCompleteList(pollingStationsList);
    }
  }, [pollingStationsList])

  const setPollingStations = (list) => {
    setPollingStationIds(list)
  }

  const onPressListItem = (pollingStationId) => {
    setPollingStations([pollingStationId.toString()]);
    onSearch('');
    pollingStationIdsCallback.current = true;
  }

  const setOpenModalAndSubmit = () => {
    setOpenModal(false);
    onSetPollingStation(pollingStationIds)
  }

  const renderItem = ({item}) => {
    return (
      <Pressable 
        onPress={() => onPressListItem(item.id)}
        style={({ pressed }) => [
          styles.dropdownItem,
          pressed && { backgroundColor: THEME.COLOR.PRIMARY_BACKGROUND },
        ]}
      >
        <View style={styles.dropdownItemContent}>
          <Icon source="bank" size={16} color={THEME.COLOR.PRIMARY} />
          <Text style={styles.dropdownItemText}>{item.name}</Text>
          <View style={styles.partBadge}>
            <Text style={styles.partBadgeText}>{STRINGS.PART_NO_LABEL} {item.part_no}</Text>
          </View>
        </View>
      </Pressable>
    )
  }
  
  const onOuterContainerLayout = () => {
    outerContainerRef.current?.measureInWindow((_x, y, _w, height) => {
      setDropdownTop(y + height + 4);
    });
  };

  return (
    <>
      <View
        ref={outerContainerRef}
        onLayout={onOuterContainerLayout}
        style={styles.outerContainer}
      >
        <View style={[styles.container, { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }]}>
          <Searchbar
            placeholder={STRINGS.SEARCH_POLLING_STATION_PLACEHOLDER}
            onChangeText={onSearch}
            value={searchText}
            mode={'view'}
            showDivider={false}
            clearIcon={true}
            onClearIconPress={() => onSearch('')}
            inputStyle={styles.searchInput}
            style={styles.searchWrapper}
            iconColor={THEME.COLOR.TEXT_MUTED}
            placeholderTextColor={THEME.COLOR.TEXT_MUTED}
          />

          {searchText.length > 0 &&
            <Portal>
              <View style={[styles.dropdown, { maxWidth: contentMaxWidth - 40, top: dropdownTop }]}>
              {
                pollingStationsList.length > 0 &&
                <FlashListCompat
                  data={filteredCompleteList}
                  renderItem={renderItem}
                  keyExtractor={item => item.id.toString()}
                  estimatedItemSize={50}
                />
              }
              </View>
            </Portal>
          }

          <Pressable 
            onPress={() => setOpenModal(true)}
            style={({ pressed }) => [
              styles.filterButton,
              pressed && { opacity: THEME.OPACITY.PRESSED },
            ]}
          >
            <Icon source="format-list-text" size={20} color={THEME.COLOR.PRIMARY_FOREGROUND} />
            {pollingStationIds?.length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{pollingStationIds.length}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
      {pollingStationsList?.length > 0 && <MultiSelectModal
        openModal={openModal}
        setOpenModal={setOpenModalAndSubmit}
        selectedValuesList={pollingStationIds}
        completeList={pollingStationsList.map(pollingStation => ({ id: pollingStation.id, value: `${pollingStation.name} (${STRINGS.PART_NO_LABEL} - ${pollingStation.part_no})` }))}
        setSelectedValuesListCb={setPollingStations}
      />}
      
    </>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: THEME.COLOR.PRIMARY,
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.SPACING.MD,
    paddingVertical: THEME.SPACING.SM,
    gap: THEME.SPACING.SM,
  },
  searchWrapper: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: THEME.BORDER_RADIUS.MD,
    height: 42,
    ...THEME.SHADOW.LIGHT,
  },
  searchInput: {
    minHeight: 20,
    fontSize: THEME.FONT_SIZE.MD,
  },
  dropdown: {
    position: 'absolute',
    width: Dimensions.get("window").width - 40,
    alignSelf: 'center',
    backgroundColor: THEME.COLOR.SURFACE,
    borderRadius: THEME.BORDER_RADIUS.MD,
    maxHeight: 300,
    elevation: 8,
    borderWidth: 1,
    borderColor: THEME.COLOR.BORDER_LIGHT,
    ...THEME.SHADOW.HEAVY,
  },
  dropdownItem: {
    paddingVertical: THEME.SPACING.MD,
    paddingHorizontal: THEME.SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: THEME.COLOR.BORDER_LIGHT,
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.SPACING.SM,
  },
  dropdownItemText: {
    fontSize: THEME.FONT_SIZE.SM,
    fontWeight: THEME.FONT_WEIGHT.SEMIBOLD,
    color: THEME.COLOR.TEXT_PRIMARY,
    flex: 1,
  },
  partBadge: {
    backgroundColor: THEME.COLOR.SURFACE_ELEVATED,
    borderRadius: THEME.BORDER_RADIUS.FULL,
    paddingHorizontal: THEME.SPACING.SM,
    paddingVertical: THEME.SPACING.XXS,
  },
  partBadgeText: {
    fontSize: 10,
    color: THEME.COLOR.TEXT_SECONDARY,
    fontWeight: THEME.FONT_WEIGHT.MEDIUM,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: THEME.BORDER_RADIUS.MD,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: THEME.COLOR.ACCENT,
    borderRadius: THEME.BORDER_RADIUS.FULL,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: THEME.FONT_WEIGHT.BOLD,
  },
});
