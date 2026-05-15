import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import clinicianApi from '../services/clinicianApi';

interface VoiceNoteModalProps {
  visible: boolean;
  visitId: string;
  onClose: () => void;
  onResult: (data: any) => void;
}

export default function VoiceNoteModal({ visible, visitId, onClose, onResult }: VoiceNoteModalProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval: any;
    if (recording) {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync( Audio.RecordingOptionsPresets.HIGH_QUALITY );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    setRecording(null);
    await recording?.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording?.getURI();
    
    if (uri) {
      handleProcess(uri);
    }
  }

  const handleProcess = async (uri: string) => {
    setIsProcessing(true);
    try {
      const data = await clinicianApi.processVoiceNote(visitId, uri);
      onResult(data);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Voice processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>AI VOICE DICTATION</Text>
            <TouchableOpacity onPress={onClose} disabled={isProcessing}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.micCircle}>
              {recording && <View style={styles.pulseRing} />}
              <TouchableOpacity 
                style={[styles.micButton, recording && styles.stopButton]} 
                onPress={recording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                <Ionicons name={recording ? "stop" : "mic"} size={40} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.timer}>{formatTime(duration)}</Text>
            <Text style={styles.instruction}>
              {recording ? 'Recording... tap to stop' : 'Tap to start dictating notes'}
            </Text>
            
            {isProcessing && (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#1B6CA8" size="small" />
                <Text style={styles.processingText}>AI is transcribing & extracting data...</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.footerInfo}>
             Mention chief complaint, findings, and medications.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 32,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B6CA8',
    letterSpacing: 1.5,
  },
  content: {
    alignItems: 'center',
    marginBottom: 40,
  },
  micCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1B6CA8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 8,
    shadowColor: '#1B6CA8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  stopButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    zIndex: 1,
  },
  timer: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  processingText: {
    fontSize: 12,
    color: '#1B6CA8',
    fontWeight: '700',
  },
  footerInfo: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
