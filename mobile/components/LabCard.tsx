import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import StatusBadge from './StatusBadge';

interface LabCardProps {
  lab: any;
  isNew?: boolean;
}

export default function LabCard({ lab, isNew }: LabCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isResulted = lab.status === 'resulted';
  
  // Use simple date string
  const orderDateStr = typeof lab.ordered_date === 'string' ? lab.ordered_date.split('T')[0] : 'Unknown Date';
  const resultDateStr = typeof lab.result_date === 'string' ? lab.result_date.split('T')[0] : '';

  const getBadgeType = (status: string) => {
    switch (status) {
      case 'resulted': return 'success';
      case 'pending': return 'warning';
      case 'collected': return 'info';
      default: return 'info';
    }
  };

  const getBadgeLabel = (status: string) => {
    switch (status) {
      case 'resulted': return 'Result ready';
      case 'pending': return 'Awaiting sample';
      case 'collected': return 'Processing';
      default: return status;
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity 
        onPress={() => isResulted && setExpanded(!expanded)} 
        activeOpacity={isResulted ? 0.7 : 1}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8}}>
            <Text style={styles.testName}>{lab.test_name}</Text>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <StatusBadge 
            type={getBadgeType(lab.status)} 
            label={getBadgeLabel(lab.status)} 
          />
        </View>
        <View style={styles.headerBottom}>
          <Text style={styles.orderedBy}>Ordered by: {lab.ordered_by}</Text>
          <Text style={styles.orderDate}>{orderDateStr}</Text>
        </View>
      </TouchableOpacity>
      
      {expanded && isResulted && (
        <View style={styles.expandedContent}>
          <Text style={styles.resultLabel}>Result ({resultDateStr})</Text>
          <Text style={styles.resultText}>What this means: {lab.result}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  header: {
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  headerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderedBy: {
    fontSize: 13,
    color: '#666',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
  },
  expandedContent: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  resultLabel: {
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1B6CA8',
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  }
});
