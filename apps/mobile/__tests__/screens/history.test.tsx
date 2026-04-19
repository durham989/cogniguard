// apps/mobile/__tests__/screens/history.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import HistoryScreen from '@/app/(tabs)/history';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: {
    conversations: {
      list: jest.fn(),
      messages: jest.fn(),
    },
    exercises: {
      history: jest.fn(),
    },
  },
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn(() => ({ token: 'tok-123' })),
}));

const mockReset = jest.fn();
const mockSetConversationId = jest.fn();
const mockLoadMessages = jest.fn();
jest.mock('@/store/conversation.store', () => ({
  useConversationStore: jest.fn(() => ({
    reset: mockReset,
    setConversationId: mockSetConversationId,
    loadMessages: mockLoadMessages,
  })),
}));

const mockList = api.conversations.list as jest.Mock;
const mockExerciseHistory = api.exercises.history as jest.Mock;
const mockMessages = api.conversations.messages as jest.Mock;

const fakeConversations = [
  { id: 'c1', name: 'Memory Chat', state: 'FREE_CHAT', startedAt: '2024-01-15T10:00:00.000Z' },
  { id: 'c2', name: null, state: 'SESSION_END', startedAt: '2024-01-14T10:00:00.000Z' },
];

const fakeExercises = [
  {
    id: 'e1',
    exerciseId: 'ex-1',
    domain: 'memory',
    difficulty: 3,
    normalizedScore: 85,
    rawScore: 9,
    startedAt: '2024-01-15T09:00:00.000Z',
    completedAt: '2024-01-15T09:05:00.000Z',
  },
  {
    id: 'e2',
    exerciseId: 'ex-2',
    domain: 'attention',
    difficulty: 2,
    normalizedScore: null,
    rawScore: null,
    startedAt: '2024-01-14T09:00:00.000Z',
    completedAt: null,
  },
];

describe('HistoryScreen', () => {
  beforeEach(() => {
    mockList.mockResolvedValue(fakeConversations);
    mockExerciseHistory.mockResolvedValue(fakeExercises);
    mockMessages.mockResolvedValue([]);
    mockReset.mockReset();
    mockSetConversationId.mockReset();
    mockLoadMessages.mockReset();
  });

  it('renders conversations section header', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText(/Conversations/)).toBeTruthy());
  });

  it('renders AI-generated conversation name', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Memory Chat')).toBeTruthy());
  });

  it('renders "Untitled conversation" for null name', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Untitled conversation')).toBeTruthy());
  });

  it('renders exercises section with domain labels', async () => {
    render(<HistoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Memory')).toBeTruthy();
      expect(screen.getByText('Attention')).toBeTruthy();
    });
  });

  it('renders normalized score for completed exercises', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getAllByText('85')[0]).toBeTruthy());
  });

  it('renders "Incomplete" for exercises without a score', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Incomplete')).toBeTruthy());
  });

  it('shows empty state when there are no conversations or exercises', async () => {
    mockList.mockResolvedValue([]);
    mockExerciseHistory.mockResolvedValue([]);
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Nothing yet')).toBeTruthy());
  });

  it('shows error message when API call fails', async () => {
    mockList.mockRejectedValue(new Error('Server error'));
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Server error')).toBeTruthy());
  });

  it('tapping Resume calls reset, setConversationId, loadMessages', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Memory Chat')).toBeTruthy());
    fireEvent.press(screen.getAllByText('Resume →')[0]);
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
      expect(mockSetConversationId).toHaveBeenCalledWith('c1');
      expect(mockLoadMessages).toHaveBeenCalled();
    });
  });
});
