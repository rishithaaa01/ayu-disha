import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AISummaryCardProps {
  summary: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function AISummaryCard({ summary, isLoading, onRefresh }: AISummaryCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={16} color="#1B6CA8" />
          <Text style={styles.title}>AI CLINICAL SUMMARY</Text>
        </View>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} disabled={isLoading}>
            <Ionicons name="refresh" size={16} color="#1B6CA8" opacity={isLoading ? 0.3 : 1} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.summaryText}>
          {isLoading ? 'Generating fresh summary...' : summary || 'Loading AI insights...'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Ionicons name="alert-circle-outline" size={12} color="#94A3B8" />
        <Text style={styles.footerText}>Clinical AI suggestion. Verify with patient.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1B6CA8',
    letterSpacing: 1,
  },
  content: {
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
