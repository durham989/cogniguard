import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Set on assistant messages that contained an exercise score */
  exerciseResult?: {
    rawScore: number;
    normalizedScore: number;
    feedback: string;
    domain: string;
  };
}

interface ConversationState {
  conversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  /** Latest unacknowledged exercise result */
  pendingExerciseResult: ChatMessage['exerciseResult'] | null;

  setConversationId: (id: string) => void;
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeStreamingMessage: (exerciseResult?: ChatMessage['exerciseResult']) => void;
  dismissExerciseResult: () => void;
  reset: () => void;
}

let msgCounter = 0;

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  pendingExerciseResult: null,

  setConversationId: (id) => set({ conversationId: id }),

  addUserMessage: (content) => {
    const msg: ChatMessage = { id: `msg-${++msgCounter}`, role: 'user', content };
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  startStreaming: () => set({ isStreaming: true, streamingContent: '' }),

  appendStreamChunk: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),

  finalizeStreamingMessage: (exerciseResult) => {
    const { streamingContent } = get();
    const msg: ChatMessage = {
      id: `msg-${++msgCounter}`,
      role: 'assistant',
      content: streamingContent,
      exerciseResult,
    };
    set((s) => ({
      messages: [...s.messages, msg],
      isStreaming: false,
      streamingContent: '',
      pendingExerciseResult: exerciseResult ?? null,
    }));
  },

  dismissExerciseResult: () => set({ pendingExerciseResult: null }),

  reset: () =>
    set({
      conversationId: null,
      messages: [],
      isStreaming: false,
      streamingContent: '',
      pendingExerciseResult: null,
    }),
}));
