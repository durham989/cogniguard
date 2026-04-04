export interface ExerciseScore {
  rawScore: number;
  normalizedScore: number;
  feedback: string;
  cleanText: string;
}

const SCORE_PATTERN = /^EXERCISE_SCORE:\s*(\{.+\})\s*$/m;

/**
 * Parses an EXERCISE_SCORE JSON marker that Claude embeds in its response.
 * Returns the score payload and the message text with the marker stripped,
 * or null if no marker is present.
 */
export function extractExerciseScore(text: string): ExerciseScore | null {
  const match = text.match(SCORE_PATTERN);
  if (!match) return null;

  try {
    const payload = JSON.parse(match[1]) as {
      rawScore: number;
      normalizedScore: number;
      feedback: string;
    };
    const cleanText = text.replace(SCORE_PATTERN, '').trim();
    return {
      rawScore: payload.rawScore,
      normalizedScore: payload.normalizedScore,
      feedback: payload.feedback,
      cleanText,
    };
  } catch {
    return null;
  }
}

/**
 * Builds the system prompt appendix injected when an exercise is active.
 */
export function buildExerciseSystemPrompt(exerciseFragment: string): string {
  return `\n\n--- ACTIVE EXERCISE ---\n${exerciseFragment}\n--- END EXERCISE ---`;
}
