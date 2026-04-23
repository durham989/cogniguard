import type { CognitiveDomain } from './user.js';

export type InputType = 'free-text' | 'multiple-choice' | 'word-bank' | 'sequence-recall';

export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface WordBankData {
  sentence: string;
  answers: string[];
  bankWords: string[];
}

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
  | 'pattern_description'
  | 'dual_task_verbal'
  | 'dual_task_inhibition'
  | 'social_cognition_emotion'
  | 'social_cognition_tom'
  | 'prospective_memory'
  | 'analogical_reasoning'
  | 'selective_attention'
  | 'digit_symbol_coding'
  | 'trail_making'
  | 'planning'
  | 'pragmatic_language'
  | 'pattern_recognition'
  | 'mental_rotation'
  | 'paired_associates'
  | 'name_occupation_recall'
  | 'flanker_task'
  | 'serial_subtraction'
  | 'mental_arithmetic'
  | 'fraction_comparison'
  | 'syllogism'
  | 'similarities'
  | 'synonym_selection'
  | 'definition_matching'
  | 'phonological_awareness'
  | 'compass_rotation'
  | 'time_calculation'
  | 'grammatical_judgment'
  | 'clock_reading'
  | 'semantic_association'
  | 'prospective_event';

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
  /** Defaults to 'free-text' when absent */
  inputType?: InputType;
  /** Present when inputType === 'multiple-choice' */
  options?: MultipleChoiceOption[];
  /** Present when inputType === 'word-bank' */
  wordBankData?: WordBankData;
  /** Present when inputType === 'sequence-recall' */
  sequenceItems?: string[];
  /** How long to show the sequence before hiding it (ms). Default 4000 */
  sequenceDisplayMs?: number;
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

export type TypedAnswer =
  | { inputType: 'multiple-choice'; selectedOptionId: string }
  | { inputType: 'word-bank'; filledBlanks: string[] }
  | { inputType: 'sequence-recall'; sequence: string[] };

export interface TypedScoreRequest {
  answer: TypedAnswer;
  durationSeconds: number;
}

export interface TypedScoreResult {
  exerciseSessionId: string;
  rawScore: number;
  normalizedScore: number;
  domain: string;
  feedback: string;
}
