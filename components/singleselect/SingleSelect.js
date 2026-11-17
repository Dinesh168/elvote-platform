import { useState } from "react";
import { Button } from "react-native-paper";
import SingleSelectModal from "./SingleSelectModal";

export default function SingleSelect({ selectedText, selectedValue, completeList, setSelectedValueCb }) {
  const [openModal, setOpenModal] = useState(false);
  
  return (
    <>
      <Button mode="contained-tonal" onPress={() => setOpenModal(true)}>{ selectedText }</Button>
      <SingleSelectModal
        openModal={openModal}
        setOpenModal={setOpenModal}
        selectedValue={selectedValue}
        completeList={completeList}
        setSelectedValueCb={setSelectedValueCb}
      />
    </>
  )
}
