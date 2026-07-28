import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { classifyRisk } from '../../services/ashaApi';
import { startRecording, stopAndTranscribe } from '../../services/voiceService';
import { openDatabase } from '../../database/database-sqlite';
import axios from 'axios';
import { Config } from '../../constants/Config';
import * as SecureStore from 'expo-secure-store';

const templates = {
  maternal: [
    { id: 'fever', q: 'Does the mother have fever?', type: 'yesno' },
    { id: 'weeks', q: 'How many weeks pregnant?', type: 'number' },
    { id: 'anc', q: 'Has she attended ANC checkup this month?', type: 'yesno', options: ['Yes', 'No', "Don't know"] },
    { id: 'complaints', q: 'Any complaints today?', type: 'multiselect', options: ['Headache', 'Swelling', 'Bleeding', 'Nausea', 'Weakness', 'None'] },
    { id: 'bp', q: 'Blood pressure reading (if checked)?', type: 'text', placeholder: 'e.g. 120/80 or leave blank' },
    { id: 'iron', q: 'Is she taking iron tablets?', type: 'select', options: ['Yes daily', 'Sometimes', 'No'] },
  ],
  child: [
    { id: 'fever', q: 'Any fever in last 3 days?', type: 'yesno' },
    { id: 'eating', q: 'Is the child eating well?', type: 'select', options: ['Yes', 'No', 'Reduced'] },
    { id: 'weight', q: 'Weight checked this month?', type: 'text', placeholder: 'Enter weight in kg or leave blank' },
    { id: 'vaccines', q: 'Any vaccinations due?', type: 'yesno', options: ['Yes', 'No', "Don't know"] },
    { id: 'signs', q: 'Any visible signs?', type: 'multiselect', options: ['Rash', 'Cough', 'Diarrhea', 'Vomiting', 'Weakness', 'None'] },
  ],
  chronic: [
    { id: 'condition', q: 'What condition does the patient have?', type: 'multiselect', options: ['Diabetes', 'Hypertension', 'TB', 'Heart disease', 'Other'] },
    { id: 'meds', q: 'Taking medicines regularly?', type: 'select', options: ['Yes daily', 'Sometimes', 'Stopped'] },
    { id: 'symptoms', q: 'Any symptoms today?', type: 'multiselect', options: ['Dizziness', 'Chest pain', 'Blurred vision', 'Coughing blood', 'None'] },
    { id: 'doctor', q: 'Last doctor visit?', type: 'select', options: ['This week', 'This month', 'Over a month ago', "Don't know"] },
  ],
  general: [
    { id: 'reason', q: 'Reason for visit today?', type: 'text', placeholder: 'Describe visually...' },
    { id: 'fever', q: 'Any fever?', type: 'yesno' },
    { id: 'duration', q: 'Duration of complaint?', type: 'select', options: ['Today', '2-3 days', 'Over a week'] },
    { id: 'severity', q: 'Severity?', type: 'select', options: ['Mild', 'Moderate', 'Severe'] },
  ]
};

export default function VisitFlowScreen() {
  const { household_id, member_id, member_name, member_age, member_gender } = useLocalSearchParams<{ household_id: string, member_id: string, member_name: string, member_age: string, member_gender: string }>();
  const router = useRouter();

  const [visitType, setVisitType] = useState<keyof typeof templates | null>(null);
  const [step, setStep] = useState(0); // 0 means selecting type
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null); // RiskResult
  const [saving, setSaving] = useState(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [offlineAudioUri, setOfflineAudioUri] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // RESET STATE when new params arrive (e.g. starting a fresh visit from households)
  useEffect(() => {
    if (household_id) {
      setVisitType(null);
      setStep(0);
      setAnswers({});
      setResult(null);
      setIsAnalyzing(false);
      setVoiceTranscript('');
    }
  }, [household_id, member_name]);

  // Handle Recording Toggle
  const toggleRecording = async () => {
    try {
      if (recording) {
        // Immediate local cleanup to prevent double-clicks
        const recToStop = recording;
        setRecording(null);
        setIsRecording(false);
        setIsProcessingVoice(true);
        
        try {
          const uri = recToStop.getURI();
          if (uri) setOfflineAudioUri(uri);
          
          const transcript = await stopAndTranscribe(recToStop);
          if (transcript) {
            setVoiceTranscript(prev => prev + (prev ? ' ' : '') + transcript);
          } else {
            setVoiceTranscript(prev => prev + (prev ? ' ' : '') + "[Voice note recorded offline]");
          }
        } finally {
          setIsProcessingVoice(false);
        }
      } else {
        const newRecording = await startRecording();
        setRecording(newRecording);
        setIsRecording(true);
      }
    } catch (e) {
      console.error(e);
      setIsProcessingVoice(false);
      alert("Failed to record audio.");
    }
  };

  // 0. CHECK: DID WE COME HERE WITH A PATIENT?
  if (!household_id) {
    return (
      <SafeAreaView style={[styles.container, styles.centeredLoading]}>
        <Ionicons name="alert-circle" size={64} color="#F57C00" />
        <Text style={[styles.questionText, { marginTop: 16 }]}>No Patient Selected</Text>
        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 24, paddingHorizontal: 40 }}>
          Please go to the Village screen and select a household to start a visit.
        </Text>
        <TouchableOpacity 
          style={styles.nextBtn} 
          onPress={() => router.replace('/(asha)/village')}
        >
          <Text style={styles.nextText}>Go to Village</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 1. Visit Type Selection Screen
  if (!visitType) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Visit: {member_name || 'Patient'}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.questionText}>What type of visit is this?</Text>
          <View style={styles.typeGrid}>
            <TouchableOpacity style={styles.typeCard} onPress={() => { setVisitType('maternal'); setStep(1); }}>
              <Ionicons name="woman" size={32} color="#1B6CA8" />
              <Text style={styles.typeLabel}>Maternal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.typeCard} onPress={() => { setVisitType('child'); setStep(1); }}>
              <Ionicons name="happy" size={32} color="#1B6CA8" />
              <Text style={styles.typeLabel}>Child Health</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.typeCard} onPress={() => { setVisitType('chronic'); setStep(1); }}>
              <Ionicons name="medical" size={32} color="#1B6CA8" />
              <Text style={styles.typeLabel}>Chronic</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.typeCard} onPress={() => { setVisitType('general'); setStep(1); }}>
              <Ionicons name="body" size={32} color="#1B6CA8" />
              <Text style={styles.typeLabel}>General</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Analyzing Loading Screen
  if (isAnalyzing) {
    return (
      <SafeAreaView style={[styles.container, styles.centeredLoading]}>
        <ActivityIndicator size="large" color="#1B6CA8" />
        <Text style={styles.loadingText}>Groq AI is analysing visit observations...</Text>
      </SafeAreaView>
    );
  }

  // Final Results Screen
  if (result) {
    const isUrgent = result.risk_level === 'URGENT';
    const isAmber = result.risk_level === 'WATCH';
    const mainColor = isUrgent ? '#D32F2F' : (isAmber ? '#F57C00' : '#388E3C');

    const handleSave = async () => {
      setSaving(true);
      try {
        const db = await openDatabase();
        
        await db.runAsync(`
          INSERT INTO asha_visits (
            household_id, member_id, visit_type, observations_json, 
            voice_notes, risk_level, ai_reasoning, ai_recommendation, offline_audio_uri, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
          String(household_id), 
          String(member_id || member_name || 'Patient'), 
          String(visitType || 'general'), 
          String(JSON.stringify(answers)), 
          String(voiceTranscript || ''), 
          String(result.risk_level || 'WATCH'), 
          String(result.reasoning || ''), 
          String(result.recommendation || ''),
          String(offlineAudioUri || ''),
          0
        ]);

        await db.runAsync(`
          UPDATE asha_households 
          SET risk_level = ?, last_visit_date = ? 
          WHERE id = ?
        `, [
          String(result.risk_level === 'URGENT' ? 'red' : (result.risk_level === 'WATCH' ? 'amber' : 'green')),
          new Date().toISOString(),
          String(household_id)
        ]);

        if (isUrgent) {
          // 4. Submit to backend to get real visit_id (Connection 1 requirement)
          try {
            const res = await axios.post(`${Config.API_URL}/asha/visits`, {
              household_id: String(household_id),
              member_id: String(member_id || member_name),
              visit_type: String(visitType || 'general'),
              observations: answers,
              voice_notes: voiceTranscript || '',
              risk_level: result.risk_level,
              ai_reasoning: result.reasoning,
              ai_recommendation: result.recommendation
            }, {
              headers: { Authorization: `Bearer ${await SecureStore.getItemAsync('token')}` }
            });
            
            const realVisitId = res.data.visit_id;
            router.replace(`/(asha)/referral-flow?household_id=${household_id}&patient_id=${member_id || member_name}&visit_id=${realVisitId}&risk_desc=${encodeURIComponent(result.reasoning)}&obs=${encodeURIComponent(JSON.stringify(answers))}`);
          } catch (apiErr) {
            console.warn("API sync failed, falling back to local referral", apiErr);
            router.replace(`/(asha)/referral-flow?household_id=${household_id}&patient_id=${member_id || member_name}&risk_desc=${encodeURIComponent(result.reasoning)}&obs=${encodeURIComponent(JSON.stringify(answers))}`);
          }
        } else {
          router.replace('/(asha)/village');
        }
      } catch (e) {
        console.error("Local save failed:", e);
        alert("Failed to save. Please try again.");
      } finally {
        setSaving(false);
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Analysis Complete</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.resultBanner, { backgroundColor: mainColor }]}>
            <Ionicons name={isUrgent ? "alert-circle" : "checkmark-circle"} size={48} color="#fff" />
            <Text style={styles.resultRiskText}>{result.risk_level} RISK</Text>
          </View>
          
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>AI Reasoning:</Text>
            <Text style={styles.resultReasoning}>{result.reasoning}</Text>
            
            <Text style={[styles.resultLabel, {marginTop: 16}]}>Recommended Action:</Text>
            <Text style={styles.resultAction}>{result.recommendation}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.bigActionBtn, { backgroundColor: isUrgent ? '#D32F2F' : '#1B6CA8' }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.bigActionText}>{isUrgent ? 'Save & Send Referral Now' : 'Save Visit'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const questions = templates[visitType];
  const currentQIndex = step - 1;

  // Voice capture extra step at the end
  if (currentQIndex >= (visitType ? templates[visitType].length : 0)) {
    const submitAnalysis = async () => {
      setIsAnalyzing(true);
      try {
        const finalObservations = {
          ...answers,
          voice_notes: voiceTranscript
        };
        const res = await classifyRisk({
          observations: finalObservations,
          visit_type: visitType || 'general',
          member_age: parseInt(member_age || '30'),
          member_gender: member_gender || 'female'
        });
        setResult(res);
      } catch (e) {
        setResult({ risk_level: 'WATCH', reasoning: 'Offline mode active. Could not reach Groq AI.', recommendation: 'Use your clinical judgment.', refer_to_doctor: false });
      } finally {
        setIsAnalyzing(false);
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Voice Notes</Text>
        </View>
        <View style={styles.content}>
           <Text style={styles.questionText}>Any extra notes to add?</Text>
           <TouchableOpacity 
            style={[styles.micBtn, (isRecording || isProcessingVoice) && { backgroundColor: '#FFEBEE' }]}
            onPress={toggleRecording}
            disabled={isProcessingVoice}
           >
              {isProcessingVoice ? (
                <ActivityIndicator color="#D32F2F" />
              ) : (
                <Ionicons name={isRecording ? "stop-circle" : "mic"} size={64} color={isRecording ? "#D32F2F" : "#1B6CA8"} />
              )}
              <Text style={{color: '#666', marginTop: 8}}>
                {isProcessingVoice ? "Transcribing..." : (isRecording ? "Stop Recording..." : "Tap to Record Note")}
              </Text>
           </TouchableOpacity>

           {voiceTranscript ? (
             <View style={styles.transcriptContainer}>
               <Text style={styles.transcriptLabel}>Transcribed Text:</Text>
               <Text style={styles.transcriptText}>{voiceTranscript}</Text>
             </View>
           ) : null}

           <TouchableOpacity style={[styles.nextBtn, {marginTop: 'auto'}]} onPress={submitAnalysis}>
            <Text style={styles.nextText}>Finish & Analyze</Text>
            <Ionicons name="checkmark" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentQIndex];

  const toggleMultiselect = (val: string) => {
    const existing = answers[currentQ.id] || [];
    if (existing.includes(val)) {
      setAnswers({...answers, [currentQ.id]: existing.filter((x: string) => x !== val)});
    } else {
      setAnswers({...answers, [currentQ.id]: [...existing, val]});
    }
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => {
    if (step === 1) setVisitType(null);
    else setStep(step - 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressHeader}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.progressText}>Step {step} of {questions.length + 1}</Text>
        <TouchableOpacity onPress={handleNext}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.progressLineOuter}>
        <View style={[styles.progressLineInner, { width: `${(step / (questions.length + 1)) * 100}%` }]} />
      </View>

      <View style={styles.questionContent}>
        <Text style={styles.questionTextLarge}>{currentQ.q}</Text>
        
        <View style={styles.inputArea}>
          {(currentQ.type === 'yesno' || (currentQ as any).options) && (
            <View>
              {(currentQ.options || ['Yes', 'No']).map((opt: string) => {
                const selected = answers[currentQ.id] === opt;
                return (
                   <TouchableOpacity 
                    key={opt} 
                    style={[styles.answerBtn, selected && styles.answerBtnSelected]}
                    onPress={() => setAnswers({...answers, [currentQ.id]: opt})}
                   >
                     <Text style={[styles.answerBtnText, selected && styles.answerBtnTextSelected]}>{opt}</Text>
                   </TouchableOpacity>
                );
              })}
            </View>
          )}

          {currentQ.type === 'multiselect' && (
            <View style={styles.gridContainer}>
              {(currentQ.options || []).map((opt: string) => {
                const selected = (answers[currentQ.id] || []).includes(opt);
                return (
                   <TouchableOpacity 
                    key={opt} 
                    style={[styles.multiBtn, selected && styles.multiBtnSelected]}
                    onPress={() => toggleMultiselect(opt)}
                   >
                     <Text style={[styles.multiBtnText, selected && styles.multiBtnTextSelected]}>{opt}</Text>
                   </TouchableOpacity>
                );
              })}
            </View>
          )}

          {(currentQ.type === 'text' || currentQ.type === 'number') && (
            <TextInput 
              style={styles.textInput}
              placeholder={(currentQ as any).placeholder || "Enter value..."}
              keyboardType={currentQ.type === 'number' ? 'numeric' : 'default'}
              value={answers[currentQ.id] || ''}
              onChangeText={(text) => setAnswers({...answers, [currentQ.id]: text})}
            />
          )}

          {currentQ.type === 'select' && (
             <View>
             {(currentQ.options || []).map((opt: string) => {
               const selected = answers[currentQ.id] === opt;
               return (
                  <TouchableOpacity 
                   key={opt} 
                   style={[styles.answerBtn, selected && styles.answerBtnSelected]}
                   onPress={() => setAnswers({...answers, [currentQ.id]: opt})}
                  >
                    <Text style={[styles.answerBtnText, selected && styles.answerBtnTextSelected]}>{opt}</Text>
                  </TouchableOpacity>
               );
             })}
           </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.nextBtn, !answers[currentQ.id] && currentQ.type !== 'text' ? styles.nextBtnDisabled : {}]} 
          onPress={handleNext}
        >
          <Text style={styles.nextText}>Next</Text>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centeredLoading: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F3EE' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666', fontWeight: '500' },
  header: { backgroundColor: '#1B6CA8', padding: 16, paddingTop: 48, flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 24, flex: 1 },
  questionText: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 24, textAlign: 'center' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  typeCard: { width: '48%', backgroundColor: '#E8F4FD', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  typeLabel: { marginTop: 12, fontSize: 16, fontWeight: 'bold', color: '#1B6CA8' },
  
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 40 },
  progressText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  skipText: { fontSize: 16, color: '#1B6CA8' },
  progressLineOuter: { height: 4, backgroundColor: '#E0E0E0', width: '100%' },
  progressLineInner: { height: 4, backgroundColor: '#1B6CA8' },
  questionContent: { flex: 1, padding: 24 },
  questionTextLarge: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 32, lineHeight: 36 },
  inputArea: { flex: 1 },
  
  answerBtn: { backgroundColor: '#F5F5F5', padding: 20, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  answerBtnSelected: { backgroundColor: '#E8F4FD', borderColor: '#1B6CA8' },
  answerBtnText: { fontSize: 20, fontWeight: '500', color: '#333', textAlign: 'center' },
  answerBtnTextSelected: { color: '#1B6CA8', fontWeight: 'bold' },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  multiBtn: { backgroundColor: '#F5F5F5', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, marginRight: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  multiBtnSelected: { backgroundColor: '#E8F4FD', borderColor: '#1B6CA8' },
  multiBtnText: { fontSize: 16, color: '#666' },
  multiBtnTextSelected: { color: '#1B6CA8', fontWeight: 'bold' },
  
  textInput: { backgroundColor: '#F5F5F5', fontSize: 20, padding: 16, borderRadius: 12 },
  nextBtn: { backgroundColor: '#1B6CA8', flexDirection: 'row', padding: 18, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  nextBtnDisabled: { backgroundColor: '#B0BEC5' },
  nextText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginRight: 8 },
  
  micBtn: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F4FD', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 40 },
  transcriptContainer: { marginTop: 24, padding: 16, backgroundColor: '#F5F5F5', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#1B6CA8' },
  transcriptLabel: { fontSize: 13, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  transcriptText: { fontSize: 16, color: '#333', lineHeight: 22 },

  resultBanner: { padding: 32, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  resultRiskText: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 16 },
  resultCard: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  resultLabel: { fontSize: 13, color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
  resultReasoning: { fontSize: 18, color: '#333', marginTop: 8, lineHeight: 26 },
  resultAction: { fontSize: 18, color: '#1B6CA8', marginTop: 8, fontWeight: '500' },
  bigActionBtn: { marginHorizontal: 24, padding: 20, borderRadius: 32, alignItems: 'center', marginBottom: 24 },
  bigActionText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
