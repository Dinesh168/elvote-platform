import { FlashList } from "@shopify/flash-list";
import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Badge, Button, Checkbox, Modal, PaperProvider, Portal, TextInput } from "react-native-paper";
import { STRINGS } from "../../strings";

export default function MultiSelectModal({ openModal, setOpenModal, selectedValuesList, completeList, setSelectedValuesListCb }) {
  const [searchText, setSearchText] = useState('');
  const [rerenderList, setRerenderList] = useState(false);

  const sortFilteredListOnCheckState = (list = []) => {
    return [...(list ?? [])].sort((a, b) => {

      const aid = (selectedValuesList ?? []).indexOf(a.id);
      const bid = (selectedValuesList ?? []).indexOf(b.id);

      let indexA = aid === -1 ? (selectedValuesList ?? []).indexOf(a.id.toString()) : aid;
      let indexB = bid === -1 ? (selectedValuesList ?? []).indexOf(b.id.toString()) : bid;

      // Compare the indices, if both are -1 (not found in elementsOnTop), maintain original order
      if (indexA === -1) indexA = Infinity;
      if (indexB === -1) indexB = Infinity;

      return indexA - indexB;
    })
  }

  const [filteredCompleteList, setFilteredCompleteList] = useState(sortFilteredListOnCheckState(completeList));

  useEffect(() => {
    if (openModal) {
      setFilteredCompleteList(sortFilteredListOnCheckState(completeList))
    }
  }, [openModal])

  useEffect(() => {
    if (rerenderList) {
      setFilteredCompleteList(sortFilteredListOnCheckState(completeList))
      setRerenderList(false);
    }
  }, [rerenderList])

  const onSearch = (text) => {
    setSearchText(text);
    const textLowerCase = text.toLowerCase();
    const searchList = completeList.filter(listItem => listItem.value.toLowerCase().startsWith(textLowerCase));
    const extendedSearchList = completeList.filter(listItem => listItem.value.toLowerCase().indexOf(textLowerCase) > -1 && !searchList.find(sL => sL.value === listItem.value));
    setFilteredCompleteList(sortFilteredListOnCheckState([...searchList, ...extendedSearchList]))
  }
  
  const ListItem = ({ item }) => {
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
      setIsChecked((selectedValuesList ?? []).includes(item.id.toString()) || (selectedValuesList ?? []).includes(item.id))
    }, [item.id])

    const onSelectPress = () => {
      setIsChecked(prev => !prev);
      setSelectedValuesListCb(prev => {
        const updatedList = (prev ?? []).includes(item.id.toString()) || (prev ?? []).includes(item.id) ? prev.filter(val => !(val === item.id.toString() || val === item.id)) : [...(prev ?? []), item.id]
        return updatedList.length === 0 ? null : updatedList; 
      });
    }

    return <Checkbox.Item
      key={item.id.toString()}
      status={isChecked ? 'checked' : 'unchecked'}
      onPress={onSelectPress}
      label={item.value}
      position={'leading'}
      labelStyle={styles.checkboxLabel}
      style={styles.checkbox}
    />
  }

  const renderItem = ({item}) => {
    return <ListItem item={item} />
  }

  return (
    <>
      <Portal>
        <Modal visible={openModal} onDismiss={() => setOpenModal(false)} contentContainerStyle={styles.containerStyle}>
          <TextInput
            label={STRINGS.SEARCH_LABEL}
            value={searchText}
            onChangeText={text => onSearch(text)}
          />
          <View style={{width: '100%', height: Dimensions.get("window").height - 150}}>
            <FlashList
              data={filteredCompleteList}
              renderItem={renderItem}
              keyExtractor={item => item.id.toString()}
              estimatedItemSize={50}
            />
          </View>
          <View style={styles.footer}>
            <Button style={styles.footerButton} mode="outlined" onPress={() => {setSelectedValuesListCb(null); setRerenderList(true);}}>{STRINGS.UNSELECT_ALL_BUTTON}</Button>
            <Button style={styles.footerButton} mode="contained" onPress={() => setOpenModal(false)}>{STRINGS.SUBMIT_BUTTON}</Button>
          </View>
        </Modal>
      </Portal>
    </>
  )
}

const styles = StyleSheet.create({
  containerStyle: {
    backgroundColor: '#FFF',
    padding: 16,
    justifyContent: 'flex-start'
  },
  checkbox: {
    paddingHorizontal: 0
  },
  checkboxLabel: {
    textAlign: 'left',
    paddingRight: 10
  },
  footer: {
    width: '100%', 
    height: 60, 
    justifyContent: 'space-between', 
    elevation: 5, 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 20
  },
  footerButton: {
    flex: 1
  }
})
