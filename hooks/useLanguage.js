import { useDispatch, useSelector } from "react-redux";
import { componentKey, setLanguage } from "../storemanagement/languagestore/LanguageSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_STORAGE_LANGUAGE_KEY } from "../constant";

export default function useLanguage() {
  const { language } = useSelector(state => state[componentKey]);
  const dispatch = useDispatch();

  const storeData = async (value) => {
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_LANGUAGE_KEY, value);
    } catch (e) { }
  };
  
  const setLang = (lang) => {
    storeData(lang);
    dispatch(setLanguage(lang));
  }

  return { language, setLanguage: setLang };
}
