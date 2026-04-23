import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import type { MultipleChoiceOption } from '@cogniguard/types';

interface Props {
  question: string;
  options: MultipleChoiceOption[];
  onSelect: (optionId: string) => void;
}

export function MultipleChoiceInput({ question, options, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function handlePress(id: string) {
    setSelected(id);
    onSelect(id);
  }

  return (
    <View style={styles.container}>
      <View style={styles.questionCard}>
        <Text style={styles.question}>{question}</Text>
      </View>

      <View style={styles.options}>
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handlePress(opt.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionDot, isSelected && styles.optionDotSelected]}>
                <Text style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                  {opt.id.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {opt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  question: {
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
  options: { gap: 10 },
  option: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  optionDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionDotSelected: {
    backgroundColor: colors.accent,
  },
  optionLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  optionLetterSelected: {
    color: colors.textOnAccent,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.accent,
  },
});
