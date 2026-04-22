import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

type Phase = 'loading' | 'ready' | 'submitting' | 'result';

interface Exercise {
  id: string;
  domain: string;
  name: string;
  standalonePrompt: string;
}

interface Result {
  rawScore: number;
  normalizedScore: number;
  domain: string;
  feedback: string;
}

export default function SoloScreen() {
  const navigation = useNavigation();
  const { token } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('loading');
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userResponse, setUserResponse] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadExercise = useCallback(async () => {
    if (!token) return;
    setPhase('loading');
    setUserResponse('');
    setResult(null);
    setElapsed(0);
    try {
      const data = await api.exercises.next(token);
      setExercise({
        id: data.exercise.id,
        domain: data.exercise.domain,
        name: data.exercise.name,
        standalonePrompt: (data.exercise as any).standalonePrompt ?? data.exercise.systemPromptFragment,
      });
      setSessionId(data.sessionId);
      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
      setPhase('ready');
    } catch {
      Alert.alert('Error', 'Could not load exercise. Please try again.');
      setPhase('loading');
    }
  }, [token]);

  useEffect(() => {
    loadExercise();
    return stopTimer;
  }, [loadExercise, stopTimer]);

  useEffect(() => {
    navigation.setOptions({ title: 'Solo Training' });
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    if (!token || !sessionId || !userResponse.trim()) return;
    stopTimer();
    const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
    setPhase('submitting');
    try {
      const data = await api.exercises.scoreStandalone(sessionId, token, {
        userResponse: userResponse.trim(),
        durationSeconds,
      });
      setResult(data);
      setPhase('result');
    } catch {
      Alert.alert('Error', 'Could not submit response. Please try again.');
      setPhase('ready');
    }
  }, [token, sessionId, userResponse, stopTimer]);

  if (phase === 'loading') {
    return (
      <View style={styles.center} testID="solo-loading">
        <ActivityIndicator size="large" color="#c4805a" />
        <Text style={styles.loadingText}>Loading exercise…</Text>
      </View>
    );
  }

  if (phase === 'result' && result) {
    const pct = Math.round(result.normalizedScore);
    return (
      <ScrollView contentContainerStyle={styles.resultContainer} testID="solo-result">
        <Text style={styles.scoreLabel}>Score</Text>
        <Text style={styles.scoreValue} testID="score-value">{pct}%</Text>
        <Text style={styles.domainBadge}>{result.domain.replace('_', ' ')}</Text>
        <Text style={styles.feedback} testID="score-feedback">{result.feedback}</Text>
        <TouchableOpacity style={styles.nextButton} onPress={loadExercise} testID="next-exercise-btn">
          <Text style={styles.nextButtonText}>Next Exercise</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.exerciseContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.exerciseName} testID="exercise-name">{exercise?.name}</Text>
        <Text style={styles.timer} testID="elapsed-timer">{elapsed}s</Text>
      </View>
      <Text style={styles.prompt} testID="exercise-prompt">{exercise?.standalonePrompt}</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Type your response here…"
        placeholderTextColor="#5c5548"
        value={userResponse}
        onChangeText={setUserResponse}
        testID="response-input"
      />
      <TouchableOpacity
        style={[styles.submitButton, !userResponse.trim() && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={phase === 'submitting' || !userResponse.trim()}
        testID="submit-btn"
      >
        {phase === 'submitting'
          ? <ActivityIndicator color="#ede5d0" />
          : <Text style={styles.submitButtonText}>Submit</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16140f',
  },
  loadingText: {
    color: '#9a9080',
    marginTop: 12,
    fontSize: 14,
  },
  exerciseContainer: {
    padding: 20,
    backgroundColor: '#16140f',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    color: '#ede5d0',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  timer: {
    color: '#c4805a',
    fontSize: 14,
    marginLeft: 8,
  },
  prompt: {
    color: '#9a9080',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1d1b14',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2e2b20',
    color: '#ede5d0',
    fontSize: 15,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#c4805a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#252219',
  },
  submitButtonText: {
    color: '#ede5d0',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    padding: 20,
    backgroundColor: '#16140f',
    flexGrow: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#9a9080',
    fontSize: 14,
    marginBottom: 4,
    marginTop: 40,
  },
  scoreValue: {
    color: '#c4805a',
    fontSize: 64,
    fontWeight: '700',
  },
  domainBadge: {
    color: '#9a9080',
    fontSize: 13,
    textTransform: 'capitalize',
    marginBottom: 24,
  },
  feedback: {
    color: '#9a9080',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  nextButton: {
    backgroundColor: '#c4805a',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ede5d0',
    fontSize: 16,
    fontWeight: '600',
  },
});
