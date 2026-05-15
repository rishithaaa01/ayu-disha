import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RiskBadgeProps {
  risk: 'urgent' | 'watch' | 'low';
}

export default function RiskBadge({ risk }: RiskBadgeProps) {
  const isUrgent = risk === 'urgent';
  const isWatch = risk === 'watch';

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: isUrgent ? '#FEE2E2' : isWatch ? '#FEF3C7' : '#DCFCE7',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isUrgent ? '#EF4444' : isWatch ? '#F59E0B' : '#22C55E',
      marginRight: 6,
    },
    text: {
      fontSize: 10,
      fontWeight: '800',
      color: isUrgent ? '#B91C1C' : isWatch ? '#B45309' : '#15803D',
      letterSpacing: 0.5,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>{risk.toUpperCase()}</Text>
    </View>
  );
}
