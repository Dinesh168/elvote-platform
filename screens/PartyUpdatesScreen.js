import { StyleSheet, View, Image } from "react-native";
import { Text } from "react-native-paper";
import React from 'react';

const PartyUpdatesScreen = () => {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/party-updates.png')} style={styles.image} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default PartyUpdatesScreen;
