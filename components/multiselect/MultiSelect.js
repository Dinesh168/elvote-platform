import { useState } from "react";
import { Button } from "react-native-paper";
import MultiSelectModal from "./MultiSelectModal";

export default function MultiSelect({ selectedText, selectedValuesList, completeList, setSelectedValuesListCb }) {
  const [openModal, setOpenModal] = useState(false);
  
  return (
    <>
      <Button mode="contained-tonal" onPress={() => setOpenModal(true)}>{ selectedText }</Button>
      <MultiSelectModal
        openModal={openModal}
        setOpenModal={setOpenModal}
        selectedValuesList={selectedValuesList}
        completeList={completeList}
        setSelectedValuesListCb={setSelectedValuesListCb}
      />
    </>
  )
}
