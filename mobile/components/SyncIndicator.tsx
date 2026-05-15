import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

export default function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable));
    });
    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: isOnline ? '#4CAF50' : '#E0E0E0' }]} />
      <Text style={[styles.text, { color: isOnline ? '#fff' : '#E0E0E0' }]}>
        {isOnline ? 'Online' : 'Offline — Sync pending'}
      </Text>
      {!isOnline && (
        <Ionicons name="cloud-offline" size={14} color="#E0E0E0" style={{ marginLeft: 4 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  }
});
