import React, { useEffect, useState } from 'react';
import { Button, Searchbar } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { componentKey as filterSortComponentKey, setFilterSort } from '../../storemanagement/filtersort/FilterSortSlice';
import { THEME } from '../../theme';
import { STRINGS } from '../../strings';

export default function SearchBar() {
  const dispatch = useDispatch();
  const { filterSort } = useSelector(state => state[filterSortComponentKey]);
  
  const [voterEpic, setVoterEpic] = useState(filterSort.voter_epic)
  const [searchText, setSearchText] = useState(filterSort.voter_epic);
  
  const setSearchTextValues = (text) => {
    setSearchText(text);
    setVoterEpic(text);
  }
  
  useEffect(() => {
    setVoterEpic(filterSort.voter_epic);
  }, [filterSort])
  
  const onSearch = () => {
    dispatch(setFilterSort({
      voter_epic: voterEpic,
    }))
  }
    
  return (
    <>
      <View style={styles.container}>
        <Searchbar
          placeholder={STRINGS.SEARCH_PLACEHOLDER}
          onChangeText={setSearchTextValues}
          value={searchText}
          mode={'view'}
          showDivider={false}
          inputStyle={{
            minHeight: 20,
          }}
          style={styles.searchWrapper}
        />
        <Button mode={'outlined'} buttonColor={'white'} compact={true} onPress={onSearch}>{STRINGS.SEARCH_BUTTON}</Button>
      </View>      
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.COLOR.PRIMARY
  },
  searchWrapper: {
    flex: 1,
    backgroundColor: THEME.COLOR.PRIMARY_FOREGROUND,
    margin: 10,
    borderRadius: 10,
    height: 40
  },
  filterButtonWrapper: {
    width: 60
  },
  badge: {
    position: 'absolute',
    right: 10
  },
  bottomSheetContent: {
    backgroundColor: 'white',
    padding: 16,
    height: 300,
  },
  contentText: {
    fontSize: 18,
    marginBottom: 20,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100
  },
  itemContainer: {
    padding: 6,
    margin: 6,
    backgroundColor: "#eee",
    color: "#000"
  },
  footerContainer: {
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#EEE',
  },
  footerButton: {
    flex: 1
  }
});
