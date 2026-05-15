import { Audio } from 'expo-av';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { Config } from '../constants/Config';

const API_URL = Config.API_URL; // Host IP

export const startRecording = async () => {
  try {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    return recording;
  } catch (err) {
    console.error('Failed to start recording', err);
    throw err;
  }
};

export const transcribe = async (uri: string) => {
    try {
        console.log('VoiceService: Starting transcription for URI:', uri);
        const token = await SecureStore.getItemAsync('token');
        
        // Use FormData for the multipart upload
        const formData = new FormData();
        // @ts-ignore - React Native FormData requires this object shape for local file URIs
        formData.append('file', {
          uri,
          name: 'voice_note.m4a',
          type: 'audio/m4a',
        });

        // NOTE: We use native `fetch` instead of axios here.
        // axios has a known React Native bug where it fails silently with 
        // "Network Error" when uploading local file:// URIs on Android.
        const response = await fetch(`${API_URL}/asha/transcribe`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Do NOT set Content-Type here - let fetch set the multipart boundary automatically
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('VoiceService: Server error:', response.status, errorText);
          return "";
        }

        const data = await response.json();
        console.log('VoiceService: Backend response:', data);
        return data.transcript;
    } catch (apiError: any) {
        console.warn('Transcription API failed:', apiError.message);
        return ""; 
    }
}

export const stopAndTranscribe = async (recording: Audio.Recording) => {
  try {
    try {
      await recording.stopAndUnloadAsync();
    } catch (stopError) {
      console.warn('Recording already stopped or unloaded:', stopError);
    }
    
    const uri = recording.getURI();
    if (!uri) return "";

    return await transcribe(uri);
  } catch (err) {
    console.error('VoiceService: Critical failure', err);
    return "";
  }
};
