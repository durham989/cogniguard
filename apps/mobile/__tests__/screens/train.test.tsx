// apps/mobile/__tests__/screens/train.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import TrainScreen from '@/app/(tabs)/index';
import { api } from '@/lib/api';
import { streamMessage } from '@/lib/sse';
import { useConversationStore } from '@/store/conversation.store';

jest.mock('@/lib/api', () => ({
  api: {
    conversations: {
      latest: jest.fn(),
      create: jest.fn(),
      messages: jest.fn(),
    },
    exercises: {
      next: jest.fn(),
      submit: jest.fn(),
    },
  },
}));

jest.mock('@/lib/sse', () => ({
  streamMessage: jest.fn(),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector: any) => {
    // Handle both selector and no-selector patterns
    const state = { token: 'tok-123' };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

const mockLatest = api.conversations.latest as jest.Mock;
const mockCreate = api.conversations.create as jest.Mock;
const mockMessages = api.conversations.messages as jest.Mock;
const mockNext = api.exercises.next as jest.Mock;
const mockSubmit = api.exercises.submit as jest.Mock;
const mockStream = streamMessage as jest.Mock;

const fakeAbort = { abort: jest.fn() };
const fakeExercise = {
  exercise: {
    id: 'ex-1',
    domain: 'memory',
    type: 'word_list',
    name: 'Word List',
    systemPromptFragment: 'Remember: apple, orange',
  },
  sessionId: 'sess-1',
};

function resetConversationStore() {
  useConversationStore.getState().reset();
}

describe('TrainScreen', () => {
  beforeEach(() => {
    resetConversationStore();
    mockNext.mockResolvedValue(fakeExercise);
    mockStream.mockReturnValue(fakeAbort);
  });

  describe('initialization', () => {
    it('resumes existing conversation when latest returns one', async () => {
      mockLatest.mockResolvedValue({ id: 'conv-1', state: 'FREE_CHAT' });
      mockMessages.mockResolvedValue([
        { id: 'm1', role: 'user', content: 'Hello', createdAt: '2024-01-15T10:00:00.000Z' },
      ]);
      render(<TrainScreen />);
      await waitFor(() => expect(screen.getByText('Hello')).toBeTruthy());
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('creates a new conversation and sends greeting when no conversation exists', async () => {
      mockLatest.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 'conv-new' });
      render(<TrainScreen />);
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        expect(mockStream).toHaveBeenCalledWith(
          'conv-new',
          expect.stringContaining('greet'),
          'tok-123',
          expect.any(Object),
        );
      });
    });

    it('fetches next exercise after conversation is ready', async () => {
      mockLatest.mockResolvedValue({ id: 'conv-1', state: 'FREE_CHAT' });
      mockMessages.mockResolvedValue([]);
      render(<TrainScreen />);
      await waitFor(() => expect(mockNext).toHaveBeenCalled());
    });
  });

  describe('message input', () => {
    beforeEach(async () => {
      mockLatest.mockResolvedValue({ id: 'conv-1', state: 'FREE_CHAT' });
      mockMessages.mockResolvedValue([]);
    });

    it('renders the message input placeholder', async () => {
      render(<TrainScreen />);
      await waitFor(() =>
        expect(screen.getByPlaceholderText('Message Pierre…')).toBeTruthy()
      );
    });

    it('calls streamMessage when send button is pressed with non-empty input', async () => {
      render(<TrainScreen />);
      await waitFor(() => expect(screen.getByPlaceholderText('Message Pierre…')).toBeTruthy());
      fireEvent.changeText(screen.getByPlaceholderText('Message Pierre…'), 'Hello Pierre');
      fireEvent.press(screen.getByText('arrow-up'));
      await waitFor(() => {
        expect(mockStream).toHaveBeenCalledWith(
          'conv-1',
          'Hello Pierre',
          'tok-123',
          expect.any(Object),
          expect.anything(),
        );
      });
    });

    it('adds user message to the list when send is pressed', async () => {
      render(<TrainScreen />);
      await waitFor(() => expect(screen.getByPlaceholderText('Message Pierre…')).toBeTruthy());
      fireEvent.changeText(screen.getByPlaceholderText('Message Pierre…'), 'Test message');
      fireEvent.press(screen.getByText('arrow-up'));
      await waitFor(() => expect(screen.getByText('Test message')).toBeTruthy());
    });

    it('clears the input after sending', async () => {
      render(<TrainScreen />);
      await waitFor(() => expect(screen.getByPlaceholderText('Message Pierre…')).toBeTruthy());
      fireEvent.changeText(screen.getByPlaceholderText('Message Pierre…'), 'Hi!');
      fireEvent.press(screen.getByText('arrow-up'));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('Message Pierre…').props.value).toBe('')
      );
    });
  });

  describe('exercise result handling', () => {
    it('calls exercises.submit when onExerciseResult fires', async () => {
      mockLatest.mockResolvedValue({ id: 'conv-1', state: 'FREE_CHAT' });
      mockMessages.mockResolvedValue([]);
      mockSubmit.mockResolvedValue({ exerciseSessionId: 'sess-1', normalizedScore: 80 });

      // Wire streamMessage to immediately fire onExerciseResult + onComplete
      mockStream.mockImplementation((_convId: string, _content: string, _token: string, callbacks: any) => {
        setTimeout(() => {
          callbacks.onExerciseResult({
            rawScore: 8,
            normalizedScore: 80,
            feedback: 'Well done!',
            domain: 'memory',
          });
          callbacks.onComplete();
        }, 0);
        return fakeAbort;
      });

      // Seed the active exercise in the store
      useConversationStore.getState().setActiveExercise({
        sessionId: 'sess-1',
        domain: 'memory',
        fragment: 'Remember: apple',
      });

      render(<TrainScreen />);
      await waitFor(() => expect(screen.getByPlaceholderText('Message Pierre…')).toBeTruthy());
      fireEvent.changeText(screen.getByPlaceholderText('Message Pierre…'), 'apple, orange');
      fireEvent.press(screen.getByText('arrow-up'));

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          'sess-1',
          'tok-123',
          expect.objectContaining({
            conversationId: 'conv-1',
            scorePayload: expect.objectContaining({ normalizedScore: 80 }),
          }),
        );
      });
    });
  });
});
