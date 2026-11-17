import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Appbar, ActivityIndicator } from "react-native-paper";

export default function TrendAnalyticsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);

  const TREND_URL = "https://election-trend.vercel.app/trend";

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator />
        </View>
      )}

      {/* REAL iframe */}
      <iframe
        src={TREND_URL}
        title="Trend Analytics"
        onLoad={() => setLoading(false)}
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fc" },
  loader: {
    position: "absolute",
    top: 120,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
  },
});