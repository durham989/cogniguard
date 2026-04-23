import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import type { WordBankData } from '@cogniguard/types';

interface Props {
  wordBankData: WordBankData;
  onChange: (filledBlanks: string[]) => void;
}

export function WordBankInput({ wordBankData, onChange }: Props) {
  const { sentence, bankWords, answers } = wordBankData;
  const blankCount = answers.length;

  const [filledBlanks, setFilledBlanks] = useState<string[]>(Array(blankCount).fill(''));
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());

  const shuffledBank = useMemo(
    () => [...bankWords].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function fillBlank(wordIndex: number, word: string) {
    const nextEmpty = filledBlanks.findIndex((b) => b === '');
    if (nextEmpty === -1) return;
    const next = [...filledBlanks];
    next[nextEmpty] = word;
    setFilledBlanks(next);
    setUsedIndices((prev) => new Set([...prev, wordIndex]));
    onChange(next);
  }

  function clearBlank(blankIndex: number) {
    const word = filledBlanks[blankIndex];
    if (!word) return;
    const bankIdx = shuffledBank.findIndex((w, i) => w === word && usedIndices.has(i));
    const next = [...filledBlanks];
    next[blankIndex] = '';
    setFilledBlanks(next);
    if (bankIdx !== -1) {
      setUsedIndices((prev) => {
        const s = new Set(prev);
        s.delete(bankIdx);
        return s;
      });
    }
    onChange(next);
  }

  const parts = sentence.split('____');
  let blankIdx = 0;

  return (
    <View style={styles.container}>
      <View style={styles.sentenceCard}>
        <View style={styles.sentenceRow}>
          {parts.map((part, i) => (
            <View key={i} style={styles.inlineRow}>
              {part.length > 0 && (
                <Text style={styles.sentenceText}>{part}</Text>
              )}
              {i < parts.length - 1 && (() => {
                const idx = blankIdx++;
                const filled = filledBlanks[idx];
                return (
                  <TouchableOpacity
                    style={[styles.blank, filled ? styles.blankFilled : styles.blankEmpty]}
                    onPress={() => filled && clearBlank(idx)}
                    disabled={!filled}
                  >
                    <Text style={filled ? styles.blankFilledText : styles.blankPlaceholder}>
                      {filled || '______'}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.bankLabel}>Word Bank</Text>
      <View style={styles.bank}>
        {shuffledBank.map((word, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.chip, usedIndices.has(i) && styles.chipUsed]}
            onPress={() => !usedIndices.has(i) && fillBlank(i, word)}
            disabled={usedIndices.has(i)}
          >
            <Text style={[styles.chipText, usedIndices.has(i) && styles.chipTextUsed]}>
              {word}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  sentenceCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sentenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sentenceText: {
    fontSize: 17,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  blank: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 3,
    borderWidth: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  blankEmpty: {
    borderColor: colors.borderMedium,
    borderStyle: 'dashed',
    backgroundColor: colors.cardMuted,
  },
  blankFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  blankPlaceholder: {
    color: colors.textTertiary,
    fontSize: 15,
    letterSpacing: 2,
  },
  blankFilledText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  bankLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipUsed: {
    backgroundColor: colors.cardMuted,
    borderColor: colors.borderLight,
    opacity: 0.4,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextUsed: {
    color: colors.textTertiary,
  },
});
