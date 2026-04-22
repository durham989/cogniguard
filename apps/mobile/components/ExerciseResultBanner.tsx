import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '@/store/conversation.store';

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

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#7a9e7a' : score >= 40 ? '#c8a84a' : '#b05848';
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
          {DOMAIN_LABELS[result.domain] ?? result.domain} Exercise
        </Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="close" size={20} color="#9a9080" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <ScoreRing score={result.normalizedScore} />
        <View style={styles.details}>
          <Text style={styles.rawScore}>Raw: {result.rawScore}</Text>
          <Text style={styles.feedback}>{result.feedback}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#252219',
    borderTopWidth: 1,
    borderTopColor: '#2e2b20',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#ede5d0',
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
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  ringLabel: {
    fontSize: 10,
    color: '#9a9080',
  },
  details: {
    flex: 1,
    gap: 4,
  },
  rawScore: {
    color: '#9a9080',
    fontSize: 12,
  },
  feedback: {
    color: '#9a9080',
    fontSize: 13,
    lineHeight: 18,
  },
});
