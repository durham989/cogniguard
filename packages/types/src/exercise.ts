import type { CognitiveDomain } from './user.js';

export type ExerciseType =
  | 'word_list_recall'
  | 'story_retelling'
  | 'n_back'
  | 'digit_span'
  | 'stroop_variant'
  | 'odd_one_out'
  | 'rapid_categorization'
  | 'number_sequence'
  | 'letter_search'
  | 'category_switching'
  | 'tower_verbal'
  | 'verbal_inhibition'
  | 'category_fluency'
  | 'letter_fluency'
  | 'sentence_completion'
  | 'mental_rotation_verbal'
  | 'direction_following'
  | 'pattern_description';

export interface ExerciseDefinition {
  id: string;
  type: ExerciseType;
  domain: CognitiveDomain;
  name: string;
  description: string;
  difficulty: number;
  durationSeconds: number;
  parameters: Record<string, unknown>;
  scoringRubric: string;
  conversationalBridges: string[];
  systemPromptFragment: string;
  standalonePrompt: string;
}

export interface ExerciseSession {
  id: string;
  userId: string;
  conversationId: string;
  exerciseType: ExerciseType;
  domain: CognitiveDomain;
  difficulty: number;
  rawScore: number | null;
  normalizedScore: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SubmitExerciseRequest {
  conversationId: string;
  userResponse: string;
  durationSeconds: number;
}

export interface ExerciseResult {
  exerciseSessionId: string;
  rawScore: number;
  normalizedScore: number;
  domain: CognitiveDomain;
  feedback: string;
}

export interface NextExerciseResponse {
  exercise: ExerciseDefinition;
  sessionId: string;
}
