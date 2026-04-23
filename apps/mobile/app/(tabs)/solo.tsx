import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { colors } from '@/constants/theme';
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
  const insets = useSafeAreaInsets();
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
        <ActivityIndicator size="large" color={colors.accent} />
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + 44}
    >
      <ScrollView
        contentContainerStyle={styles.exerciseContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.exerciseName} testID="exercise-name">{exercise?.name}</Text>
          <Text style={styles.timer} testID="elapsed-timer">{elapsed}s</Text>
        </View>
        <Text style={styles.prompt} testID="exercise-prompt">{exercise?.standalonePrompt}</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type your response here…"
          placeholderTextColor={colors.textTertiary}
          value={userResponse}
          onChangeText={setUserResponse}
          testID="response-input"
        />
      </ScrollView>
      <View style={styles.submitBar}>
        {userResponse.trim().length > 0 && (
          <TouchableOpacity style={styles.dismissButton} onPress={Keyboard.dismiss}>
            <Text style={styles.dismissText}>Done typing</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.submitButton, !userResponse.trim() && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={phase === 'submitting' || !userResponse.trim()}
          testID="submit-btn"
        >
          {phase === 'submitting'
            ? <ActivityIndicator color={colors.textOnAccent} />
            : <Text style={styles.submitButtonText}>Submit Answer</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    color: colors.textTertiary,
    marginTop: 12,
    fontSize: 14,
  },
  exerciseContainer: {
    padding: 16,
    backgroundColor: colors.bg,
    flexGrow: 1,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  timer: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  prompt: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    color: colors.textPrimary,
    fontSize: 15,
    padding: 14,
    minHeight: 130,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  submitBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.borderMedium,
    gap: 10,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dismissText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.bgSurface,
  },
  submitButtonText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    padding: 24,
    backgroundColor: colors.bg,
    flexGrow: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    color: colors.textTertiary,
    fontSize: 14,
    marginBottom: 4,
    marginTop: 40,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  scoreValue: {
    color: colors.accent,
    fontSize: 72,
    fontWeight: '700',
  },
  domainBadge: {
    color: colors.textTertiary,
    fontSize: 13,
    textTransform: 'capitalize',
    marginBottom: 32,
  },
  feedback: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  nextButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  nextButtonText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
});
