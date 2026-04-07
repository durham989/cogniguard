import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import SoloScreen from '@/app/(tabs)/solo';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNextExercise = jest.fn();
const mockScoreStandalone = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    exercises: {
      next: (...args: any[]) => mockNextExercise(...args),
      scoreStandalone: (...args: any[]) => mockScoreStandalone(...args),
    },
  },
}));

const mockAuthState = {
  token: 'test-token',
  user: { id: 'u1', email: 'a@b.com', name: 'Test', onboardingComplete: true },
};

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector?: any) =>
    selector ? selector(mockAuthState) : mockAuthState,
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockExercise = {
  exercise: {
    id: 'mem-word-recall',
    domain: 'memory',
    name: 'Word List Recall',
    type: 'word_list_recall',
    systemPromptFragment: 'EXERCISE ACTIVE',
    standalonePrompt: 'Here are 8 words to memorize: apple, bridge, lantern...',
  },
  sessionId: 'session-abc',
};

const mockResult = {
  exerciseSessionId: 'session-abc',
  rawScore: 5,
  normalizedScore: 62.5,
  domain: 'memory',
  feedback: 'Great recall!',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SoloScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNextExercise.mockResolvedValue(mockExercise);
    mockScoreStandalone.mockResolvedValue(mockResult);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows loading spinner on mount', () => {
    render(<SoloScreen />);
    expect(screen.getByTestId('solo-loading')).toBeTruthy();
  });

  it('shows exercise prompt after loading', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('exercise-prompt')).toBeTruthy());
    expect(screen.getByText('Word List Recall')).toBeTruthy();
    expect(screen.getByText('Here are 8 words to memorize: apple, bridge, lantern...')).toBeTruthy();
  });

  it('shows a timer that counts elapsed seconds', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('elapsed-timer')).toBeTruthy());
    expect(screen.getByText('0s')).toBeTruthy();

    act(() => { jest.advanceTimersByTime(3000); });
    expect(screen.getByText('3s')).toBeTruthy();
  });

  it('submit button is disabled when response is empty', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeTruthy());
    const btn = screen.getByTestId('submit-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBe(true);
  });

  it('submit button is enabled when user types a response', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('response-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('response-input'), 'apple, bridge, lantern');
    const btn = screen.getByTestId('submit-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeFalsy();
  });

  it('shows result screen after submitting', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('response-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('response-input'), 'apple, bridge, lantern');
    await act(async () => { fireEvent.press(screen.getByTestId('submit-btn')); });
    await waitFor(() => expect(screen.getByTestId('solo-result')).toBeTruthy());
    expect(screen.getByText('63%')).toBeTruthy();
    expect(screen.getByTestId('score-feedback').props.children).toBe('Great recall!');
  });

  it('calls scoreStandalone with trimmed response and durationSeconds', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('response-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('response-input'), '  apple, bridge  ');

    act(() => { jest.advanceTimersByTime(10000); }); // 10 seconds elapsed

    await act(async () => { fireEvent.press(screen.getByTestId('submit-btn')); });
    await waitFor(() => expect(mockScoreStandalone).toHaveBeenCalled());

    const [sessionId, token, body] = mockScoreStandalone.mock.calls[0];
    expect(sessionId).toBe('session-abc');
    expect(token).toBe('test-token');
    expect(body.userResponse).toBe('apple, bridge');
    expect(body.durationSeconds).toBeGreaterThanOrEqual(10);
  });

  it('loads a new exercise when Next Exercise is pressed', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('response-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('response-input'), 'apple');
    await act(async () => { fireEvent.press(screen.getByTestId('submit-btn')); });
    await waitFor(() => expect(screen.getByTestId('next-exercise-btn')).toBeTruthy());

    mockNextExercise.mockResolvedValueOnce({
      ...mockExercise,
      exercise: { ...mockExercise.exercise, name: 'Story Retelling' },
      sessionId: 'session-xyz',
    });

    await act(async () => { fireEvent.press(screen.getByTestId('next-exercise-btn')); });
    await waitFor(() => expect(mockNextExercise).toHaveBeenCalledTimes(2));
  });
});
