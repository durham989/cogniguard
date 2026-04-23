import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '@/store/conversation.store';
import { colors } from '@/constants/theme';

interface Props {
  result: NonNullable<ChatMessage['exerciseResult']>;
  onDismiss: () => void;
}

const DOMAIN_LABELS: Record<string, string> = {
  memory: 'Memory',
  attention: 'Attention',
  processing_speed: 'Processing Speed',
  executive_function: 'Executive Function',
  language: 'Language',
  visuospatial: 'Visuospatial',
};

function scoreColor(score: number) {
  if (score >= 70) return colors.success;
  if (score >= 40) return colors.warning;
  return colors.error;
}

function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <View style={[styles.ring, { borderColor: color }]}>
      <Text style={[styles.ringScore, { color }]}>{score}</Text>
      <Text style={styles.ringLabel}>/ 100</Text>
    </View>
  );
}

export function ExerciseResultBanner({ result, onDismiss }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {DOMAIN_LABELS[result.domain] ?? result.domain.replace(/_/g, ' ')} Complete
        </Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="close" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <ScoreRing score={result.normalizedScore} />
        <View style={styles.details}>
          <Text style={styles.feedback}>{result.feedback}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardWarm,
  },
  ringScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  ringLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  details: {
    flex: 1,
    gap: 4,
  },
  feedback: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
