import { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors } from '@/constants/theme';

type Phase = 'study' | 'recall';

interface Props {
  items: string[];
  displayMs?: number;
  onChange: (sequence: string[]) => void;
}

export function SequenceRecallInput({ items, displayMs = 4000, onChange }: Props) {
  const [phase, setPhase] = useState<Phase>('study');
  const [countdown, setCountdown] = useState(Math.ceil(displayMs / 1000));
  const [selected, setSelected] = useState<string[]>([]);
  const progress = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shuffled = useMemo(
    () => [...items].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: displayMs,
      useNativeDriver: false,
    }).start();

    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          setPhase('recall');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function tapItem(item: string) {
    if (selected.includes(item)) return;
    const next = [...selected, item];
    setSelected(next);
    onChange(next);
  }

  function removeLastItem() {
    const next = selected.slice(0, -1);
    setSelected(next);
    onChange(next);
  }

  if (phase === 'study') {
    return (
      <View style={styles.studyContainer}>
        <Text style={styles.studyInstruction}>Memorize this sequence</Text>
        <View style={styles.sequenceCard}>
          <View style={styles.sequenceRow}>
            {items.map((item, i) => (
              <View key={i} style={styles.sequenceItem}>
                <Text style={styles.sequenceText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.countdown}>{countdown}s</Text>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.recallContainer}>
      <View style={styles.answerCard}>
        <Text style={styles.answerLabel}>Your sequence</Text>
        <View style={styles.answerRow}>
          {selected.length === 0 ? (
            <Text style={styles.answerPlaceholder}>Tap items below in order…</Text>
          ) : (
            selected.map((item, i) => (
              <View key={i} style={styles.answerBubble}>
                <Text style={styles.answerBubbleText}>{item}</Text>
              </View>
            ))
          )}
        </View>
        {selected.length > 0 && (
          <TouchableOpacity style={styles.undoButton} onPress={removeLastItem}>
            <Text style={styles.undoText}>Undo last</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.bankLabel}>Tap in the correct order</Text>
      <View style={styles.itemGrid}>
        {shuffled.map((item) => {
          const isUsed = selected.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.itemChip, isUsed && styles.itemChipUsed]}
              onPress={() => tapItem(item)}
              disabled={isUsed}
            >
              <Text style={[styles.itemText, isUsed && styles.itemTextUsed]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  studyContainer: { gap: 16, alignItems: 'center' },
  studyInstruction: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sequenceCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sequenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  sequenceItem: {
    backgroundColor: colors.accentDim,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sequenceText: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  countdown: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  recallContainer: { gap: 16 },
  answerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  answerLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 40,
    alignItems: 'center',
  },
  answerPlaceholder: {
    color: colors.textTertiary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  answerBubble: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  answerBubbleText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  undoButton: {
    alignSelf: 'flex-start',
  },
  undoText: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  bankLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemChip: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  itemChipUsed: {
    opacity: 0.35,
    backgroundColor: colors.cardMuted,
  },
  itemText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  itemTextUsed: {
    color: colors.textTertiary,
  },
});
