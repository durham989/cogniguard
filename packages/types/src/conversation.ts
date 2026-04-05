import type { CognitiveDomain } from './user.js';

export type MessageRole = 'user' | 'assistant';

export type ConversationState =
  | 'GREETING'
  | 'FREE_CHAT'
  | 'EXERCISE_INTRO'
  | 'EXERCISE_ACTIVE'
  | 'EXERCISE_DEBRIEF'
  | 'REFLECTION'
  | 'FAREWELL'
  | 'SESSION_END';

export interface Conversation {
  id: string;
  userId: string;
  state: ConversationState;
  startedAt: string;
  endedAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokens: number | null;
  createdAt: string;
}

export type SSEEvent =
  | { type: 'message.delta'; delta: string }
  | { type: 'message.complete'; message: Message }
  | { type: 'exercise.start'; exerciseId: string; exerciseType: string; domain: CognitiveDomain; parameters: Record<string, unknown> }
  | { type: 'exercise.result'; exerciseId: string; domain: CognitiveDomain; rawScore: number; normalizedScore: number; feedback: string }
  | { type: 'state.change'; from: ConversationState; to: ConversationState }
  | { type: 'error'; message: string };

export interface SendMessageRequest {
  content: string;
}
