import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { ActivityIndicator, IconButton } from "react-native-paper";
import WebView from "react-native-webview";
import { componentKey as initSliceComponentKey } from "../storemanagement/initscreen/InitSlice";
import { useSelector } from "react-redux";
import { THEME } from "../theme";

const { height } = Dimensions.get('window');

export default function TrendAnalyticsScreen({ navigation, url = 'https://election-trend.vercel.app/trend' }) {
  const [loading, setLoading] = useState(true);

  const baseUrl = 'https://elvote-trends.champn.in/trend';
  const queryUrl = `${baseUrl}`;


  return (
    <View style={styles.container}>
      
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      <WebView
        source={{ uri: queryUrl }}
        style={styles.webview}
        scrollEnabled={true}
        scalesPageToFit={false}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setLoading(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fc',
  },
  webview: {
    flex: 1,
    height: height,
    backgroundColor: 'transparent',
  },
  loader: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
});
