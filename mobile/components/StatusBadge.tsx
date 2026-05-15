import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  type: 'success' | 'warning' | 'error' | 'info';
  label: string;
}

export default function StatusBadge({ type, label }: StatusBadgeProps) {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'warning':
        return { bg: '#FFF8E1', text: '#F57F17' };
      case 'error':
        return { bg: '#FFEBEE', text: '#C62828' };
      case 'info':
      default:
        return { bg: '#E3F2FD', text: '#1565C0' };
    }
  };

  const colors = getStyles();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
  }
});
