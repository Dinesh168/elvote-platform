import { FlashList } from "@shopify/flash-list";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Badge, Button, Checkbox, Modal, PaperProvider, Portal, RadioButton, Text, TextInput } from "react-native-paper";
import { STRINGS } from "../../strings";

export default function SingleSelectModal({ openModal, setOpenModal, selectedValue, completeList, setSelectedValueCb, onPressSubmit = () => {} }) {
  const [searchText, setSearchText] = useState('');
  const [isSubmitButtonLoading, setIsSubmitButtonLoading] = useState(false);
  const [filteredCompleteList, setFilteredCompleteList] = useState(completeList);

  const onSearch = (text) => {
    setSearchText(text);
    const textLowerCase = text.toLowerCase();
    const searchList = completeList.filter(listItem => listItem.value.toLowerCase().startsWith(textLowerCase));
    const extendedSearchList = completeList.filter(listItem => listItem.value.toLowerCase().indexOf(textLowerCase) > -1 && !searchList.find(sL => sL.value === listItem.value));
    setFilteredCompleteList([...searchList, ...extendedSearchList])
  }
  
  const ListItem = ({ item }) => {
    return <View style={{flexDirection: 'row', gap: 20, marginBottom: 10}}>
      <RadioButton value={item.id} />
      <Text>{item.value}</Text>
    </View>
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
          
          <RadioButton.Group
            onValueChange={val => setSelectedValueCb(val)}
            value={selectedValue}
          >
            <View style={{width: '100%', height: 300}}>
              <FlashList
                data={filteredCompleteList}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                estimatedItemSize={50}
              />
            </View>
          </RadioButton.Group>
        
          <View style={styles.footer}>
            <Button mode="text" onPress={() => setOpenModal(false)}>{STRINGS.CANCEL_BUTTON}</Button>
            <Button mode="contained" onPress={() => {
              setIsSubmitButtonLoading(true);
              onPressSubmit();
            }} disabled={selectedValue === null} loading={isSubmitButtonLoading}>{STRINGS.SUBMIT_BUTTON}</Button>
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
    flexDirection: 'row',
    justifyContent: "space-between",
    alignItems: 'flex-end',
    marginTop: 20
  }
})
