import { useEffect } from "react";
import useLanguage from "../../hooks/useLanguage";
import { setStringList } from "../../strings";
import { STRINGS } from './../../strings';
import { _BOOTH_STRENGTH, _GENDERS, _RELIGIONS, _ROUTES, _VOTER_OPINION, ASYNC_STORAGE_LANGUAGE_KEY, BOOTH_STRENGTH, GENDERS, RELIGIONS, ROUTES, VOTER_OPINION } from "../../constant";
import LanguageScreen from "../../screens/LanguageScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LanguageWrapper({ children }) {
  const { language, setLanguage } = useLanguage();

  const updateObject = (oldObj, newObj) => {
    return Object.entries(newObj).forEach(([key, value]) => oldObj[key] = value);
  }

  useEffect(() => {
    const getData = async () => {
      try {
        const value = await AsyncStorage.getItem(ASYNC_STORAGE_LANGUAGE_KEY);
        if (value !== null) {
          setLanguage(value);
        }
      } catch (e) {}
    };
    getData();
  }, [])

  useEffect(() => {
    if (language) {
      updateObject(STRINGS, setStringList(language));
      updateObject(ROUTES, _ROUTES());
      updateObject(RELIGIONS, _RELIGIONS());
      updateObject(BOOTH_STRENGTH, _BOOTH_STRENGTH());
      updateObject(GENDERS, _GENDERS());
      updateObject(VOTER_OPINION, _VOTER_OPINION());
    }
  }, [language])

  if (!language) {
    return <LanguageScreen />
  }

  return children
}
