import React, { useState } from 'react';
import { Platform, FlatList, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

export default function FlashListCompat({ estimatedItemSize, style, ...props }) {
  const [height, setHeight] = useState(0);

  if (Platform.OS === 'web') {
    return (
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      >
        {height > 0 && (
          <FlatList {...props} style={{ height }} />
        )}
      </View>
    );
  }

  return <FlashList {...props} estimatedItemSize={estimatedItemSize} style={style} />;
}
