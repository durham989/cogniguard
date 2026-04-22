import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';
import { API } from '@/lib/api';

const STEPS = [
  {
    icon: 'pulse-outline' as const,
    title: 'Assess Your Baseline',
    description:
      "We'll measure your cognitive baseline across six domains: memory, attention, processing speed, executive function, language, and visuospatial skills.",
  },
  {
    icon: 'chatbubbles-outline' as const,
    title: 'Natural Conversation',
    description:
      'Exercises are woven into friendly conversation with Pierre, your AI companion. No clinical-feeling tests — just a chat.',
  },
  {
    icon: 'bar-chart-outline' as const,
    title: 'Track Your Progress',
    description:
      'Your scores are tracked over time. Daily practice builds cognitive reserve and helps detect early changes.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { token, setOnboardingComplete } = useAuthStore();
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const isLast = step === STEPS.length - 1;

  async function handleContinue() {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    if (!token) return;
    setCompleting(true);
    try {
      const res = await fetch(`${API.user}/users/me/complete-onboarding`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to complete onboarding');
      }
      setOnboardingComplete();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not complete onboarding. Please try again.');
    } finally {
      setCompleting(false);
    }
  }

  const current = STEPS[step];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.iconWrap}>
        <Ionicons name={current.icon} size={72} color="#c4805a" />
      </View>

      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.description}>{current.description}</Text>

      <TouchableOpacity
        style={[styles.button, completing && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={completing}
      >
        {completing ? (
          <ActivityIndicator color="#ede5d0" />
        ) : (
          <Text style={styles.buttonText}>{isLast ? "Let's Begin" : 'Continue'}</Text>
        )}
      </TouchableOpacity>

      {step > 0 && (
        <TouchableOpacity style={styles.back} onPress={() => setStep((s) => s - 1)}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#1d1b14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2e2b20',
  },
  dotActive: {
    backgroundColor: '#c4805a',
    width: 24,
  },
  iconWrap: {
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ede5d0',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#9a9080',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#c4805a',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 48,
    alignItems: 'center',
    minWidth: 180,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ede5d0',
    fontSize: 16,
    fontWeight: '600',
  },
  back: {
    marginTop: 20,
    padding: 8,
  },
  backText: {
    color: '#5c5548',
    fontSize: 14,
  },
});
