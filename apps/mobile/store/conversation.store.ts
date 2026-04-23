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

export interface ActiveExercise {
  sessionId: string;
  domain: string;
  fragment: string;
  bridge?: string;
}

interface ConversationState {
  conversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  /** Latest unacknowledged exercise result */
  pendingExerciseResult: ChatMessage['exerciseResult'] | null;
  /** Exercise queued for Pierre to deliver */
  activeExercise: ActiveExercise | null;

  setConversationId: (id: string) => void;
  loadMessages: (msgs: Array<{ id: string; role: 'user' | 'assistant'; content: string }>) => void;
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeStreamingMessage: () => void;
  setExerciseResult: (result: NonNullable<ChatMessage['exerciseResult']>) => void;
  setActiveExercise: (exercise: ActiveExercise | null) => void;
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
  activeExercise: null,

  setConversationId: (id) => set({ conversationId: id }),

  loadMessages: (msgs) => {
    const loaded: ChatMessage[] = msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }));
    set({ messages: loaded });
  },

  addUserMessage: (content) => {
    const msg: ChatMessage = { id: `msg-${++msgCounter}`, role: 'user', content };
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  startStreaming: () => set({ isStreaming: true, streamingContent: '' }),

  appendStreamChunk: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),

  finalizeStreamingMessage: () => {
    const { streamingContent } = get();
    const msg: ChatMessage = {
      id: `msg-${++msgCounter}`,
      role: 'assistant',
      content: streamingContent,
    };
    set((s) => ({
      messages: [...s.messages, msg],
      isStreaming: false,
      streamingContent: '',
    }));
  },

  setExerciseResult: (result) => set({ pendingExerciseResult: result }),

  setActiveExercise: (exercise) => set({ activeExercise: exercise }),

  dismissExerciseResult: () => set({ pendingExerciseResult: null }),

  reset: () =>
    set({
      conversationId: null,
      messages: [],
      isStreaming: false,
      streamingContent: '',
      pendingExerciseResult: null,
      activeExercise: null,
    }),
}));
