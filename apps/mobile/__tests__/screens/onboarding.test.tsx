// apps/mobile/__tests__/screens/onboarding.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '@/app/onboarding/index';

const mockSetOnboardingComplete = jest.fn();
jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector?: any) => {
    const state = { token: 'tok-123', setOnboardingComplete: mockSetOnboardingComplete };
    return selector ? selector(state) : state;
  }),
}));

beforeEach(() => {
  mockSetOnboardingComplete.mockReset();
  (global as any).fetch = jest.fn();
});

describe('OnboardingScreen', () => {
  it('renders step 1 content on mount', () => {
    render(<OnboardingScreen />);
    expect(screen.getByText('Assess Your Baseline')).toBeTruthy();
  });

  it('does not show Back button on step 1', () => {
    render(<OnboardingScreen />);
    expect(screen.queryByText('Back')).toBeNull();
  });

  it('advances to step 2 when Continue is pressed', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() =>
      expect(screen.getByText('Natural Conversation')).toBeTruthy()
    );
  });

  it('shows Back button on step 2', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Back')).toBeTruthy());
  });

  it('goes back to step 1 when Back is pressed on step 2', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Back')).toBeTruthy());
    fireEvent.press(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByText('Assess Your Baseline')).toBeTruthy());
  });

  it('advances through to step 3 showing Track Your Progress', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Natural Conversation')).toBeTruthy());
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Track Your Progress')).toBeTruthy());
  });

  it("shows \"Let's Begin\" button on last step", async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Continue')).toBeTruthy());
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText("Let's Begin")).toBeTruthy());
  });

  it("calls complete-onboarding endpoint and setOnboardingComplete on finish", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true });
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Continue')).toBeTruthy());
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText("Let's Begin")).toBeTruthy());
    fireEvent.press(screen.getByText("Let's Begin"));
    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/complete-onboarding'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockSetOnboardingComplete).toHaveBeenCalled();
    });
  });
});
