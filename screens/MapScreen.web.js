import React, { useState } from "react";
import {
  Dimensions,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { ActivityIndicator } from "react-native-paper";
import WebView from "react-native-webview";

const { height } = Dimensions.get("window");

export default function MapScreen() {
  const [loading, setLoading] = useState(true);

  const queryUrl = "https://elvote-trends.champn.in/map";

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      {Platform.OS === "web" ? (
        <iframe
          src={queryUrl}
          title="Election Map"
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            border: "none",
          }}
          onLoad={() => setLoading(false)}
        />
      ) : (
        <WebView
          source={{ uri: queryUrl }}
          style={styles.webview}
          scrollEnabled
          javaScriptEnabled
          domStorageEnabled
          onLoadEnd={() => setLoading(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fc",
  },
  webview: {
    flex: 1,
    height: height,
    backgroundColor: "transparent",
  },
  loader: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
  },
});