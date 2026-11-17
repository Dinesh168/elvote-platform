import React from 'react';
import './firebaseConfig';
import { store } from '@betacrew/jars-flux';
import { Provider } from 'react-redux';
import NavigationStack from './NavigationStack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Portal } from 'react-native-paper';
import LanguageWrapper from './components/languagewrapper/LanguageWrapper';
import { Platform, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

const App = () => {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider style={{ flex: 1 }} edges={['bottom']}>
          <Portal.Host>
            <LanguageWrapper>
              {Platform.OS !== 'web' && (
                <StatusBar barStyle="light-content" backgroundColor="rgba(14, 50, 110, 1)" />
              )}
              <BottomSheetModalProvider>
                <NavigationStack />
              </BottomSheetModalProvider>
            </LanguageWrapper>
          </Portal.Host>
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default App;
