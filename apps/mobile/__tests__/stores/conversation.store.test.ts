// apps/mobile/__tests__/stores/conversation.store.test.ts
import { useConversationStore } from '@/store/conversation.store';

function resetStore() {
  useConversationStore.getState().reset();
}

const exerciseResult = {
  rawScore: 7,
  normalizedScore: 70,
  feedback: 'Good job!',
  domain: 'memory',
};

describe('conversation.store', () => {
  beforeEach(resetStore);

  it('starts with empty state', () => {
    const s = useConversationStore.getState();
    expect(s.conversationId).toBeNull();
    expect(s.messages).toHaveLength(0);
    expect(s.isStreaming).toBe(false);
    expect(s.streamingContent).toBe('');
    expect(s.pendingExerciseResult).toBeNull();
    expect(s.activeExercise).toBeNull();
  });

  describe('setConversationId', () => {
    it('sets the conversation ID', () => {
      useConversationStore.getState().setConversationId('conv-1');
      expect(useConversationStore.getState().conversationId).toBe('conv-1');
    });
  });

  describe('loadMessages', () => {
    it('replaces messages with the provided list', () => {
      const msgs = [
        { id: 'a', role: 'user' as const, content: 'Hello' },
        { id: 'b', role: 'assistant' as const, content: 'Hi there' },
      ];
      useConversationStore.getState().loadMessages(msgs);
      const { messages } = useConversationStore.getState();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].role).toBe('assistant');
    });
  });

  describe('addUserMessage', () => {
    it('appends a user message', () => {
      useConversationStore.getState().addUserMessage('Hi');
      useConversationStore.getState().addUserMessage('There');
      expect(useConversationStore.getState().messages).toHaveLength(2);
      expect(useConversationStore.getState().messages[1].content).toBe('There');
      expect(useConversationStore.getState().messages[1].role).toBe('user');
    });
  });

  describe('streaming', () => {
    it('startStreaming sets isStreaming=true and clears content', () => {
      useConversationStore.setState({ streamingContent: 'old', isStreaming: false });
      useConversationStore.getState().startStreaming();
      expect(useConversationStore.getState().isStreaming).toBe(true);
      expect(useConversationStore.getState().streamingContent).toBe('');
    });

    it('appendStreamChunk accumulates text', () => {
      useConversationStore.getState().startStreaming();
      useConversationStore.getState().appendStreamChunk('Hel');
      useConversationStore.getState().appendStreamChunk('lo!');
      expect(useConversationStore.getState().streamingContent).toBe('Hello!');
    });

    it('finalizeStreamingMessage converts stream to message and stops streaming', () => {
      useConversationStore.getState().startStreaming();
      useConversationStore.getState().appendStreamChunk('Streaming reply');
      useConversationStore.getState().finalizeStreamingMessage();

      const { messages, isStreaming, streamingContent } = useConversationStore.getState();
      expect(isStreaming).toBe(false);
      expect(streamingContent).toBe('');
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toBe('Streaming reply');
    });

    it('finalizes with empty string when nothing was streamed', () => {
      useConversationStore.getState().startStreaming();
      useConversationStore.getState().finalizeStreamingMessage();
      expect(useConversationStore.getState().messages[0].content).toBe('');
    });
  });

  describe('exercise result', () => {
    it('setExerciseResult stores the result', () => {
      useConversationStore.getState().setExerciseResult(exerciseResult);
      expect(useConversationStore.getState().pendingExerciseResult).toEqual(exerciseResult);
    });

    it('dismissExerciseResult clears the result', () => {
      useConversationStore.getState().setExerciseResult(exerciseResult);
      useConversationStore.getState().dismissExerciseResult();
      expect(useConversationStore.getState().pendingExerciseResult).toBeNull();
    });
  });

  describe('setActiveExercise', () => {
    it('sets and clears active exercise', () => {
      const ex = { sessionId: 's1', domain: 'memory', fragment: 'Remember this list...' };
      useConversationStore.getState().setActiveExercise(ex);
      expect(useConversationStore.getState().activeExercise).toEqual(ex);
      useConversationStore.getState().setActiveExercise(null);
      expect(useConversationStore.getState().activeExercise).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      useConversationStore.getState().setConversationId('conv-x');
      useConversationStore.getState().addUserMessage('Hello');
      useConversationStore.getState().startStreaming();
      useConversationStore.getState().setExerciseResult(exerciseResult);
      useConversationStore.getState().reset();

      const s = useConversationStore.getState();
      expect(s.conversationId).toBeNull();
      expect(s.messages).toHaveLength(0);
      expect(s.isStreaming).toBe(false);
      expect(s.pendingExerciseResult).toBeNull();
    });
  });
});
