import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1B6CA8" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F3EE',
  },
});
