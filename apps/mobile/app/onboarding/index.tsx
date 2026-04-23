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
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

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
      await api.users.completeOnboarding(token);
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
        <Ionicons name={current.icon} size={72} color={colors.accent} />
      </View>

      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.description}>{current.description}</Text>

      <TouchableOpacity
        style={[styles.button, completing && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={completing}
      >
        {completing ? (
          <ActivityIndicator color={colors.textOnAccent} />
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
    backgroundColor: colors.bg,
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
    backgroundColor: colors.borderMedium,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  iconWrap: {
    marginBottom: 32,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 48,
    alignItems: 'center',
    minWidth: 180,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  back: {
    marginTop: 20,
    padding: 8,
  },
  backText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
});
