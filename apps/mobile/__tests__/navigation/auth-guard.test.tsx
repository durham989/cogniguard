import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
import * as ExpoRouter from 'expo-router';

const mockUseSegments = ExpoRouter.useSegments as jest.Mock;

// Prefix with "mock" so Jest's hoisting allows this variable to be referenced
// inside the jest.mock() factory closure.
const mockAuthState = {
  token: null as string | null,
  user: null as any,
  hydrated: true,
  hydrate: jest.fn().mockResolvedValue(undefined),
};

// Mock useAuthStore to handle both call patterns:
//   AuthGuard:   useAuthStore()              → returns full state object
//   RootLayout:  useAuthStore(s => s.hydrate) → runs selector against state
jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector?: (s: any) => any) => {
    if (selector) return selector(mockAuthState);
    return mockAuthState;
  }),
}));

function resetAuth(overrides: Partial<typeof mockAuthState> = {}) {
  Object.assign(mockAuthState, {
    token: null,
    user: null,
    hydrated: true,
    hydrate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

describe('AuthGuard navigation', () => {
  beforeEach(() => {
    resetAuth();
    // useSegments is cleared by clearAllMocks in jest.setup.ts — restore default
    mockUseSegments.mockReturnValue([]);
  });

  it('redirects unauthenticated user to login when in (tabs)', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']);
    resetAuth({ token: null, user: null, hydrated: true });
    const { __mockRouter } = jest.requireMock('expo-router');
    render(<RootLayout />);
    await waitFor(() =>
      expect(__mockRouter.replace).toHaveBeenCalledWith('/(auth)/login')
    );
  });

  it('does not redirect when unauthenticated and already in (auth)', async () => {
    mockUseSegments.mockReturnValue(['(auth)']);
    resetAuth({ token: null, user: null, hydrated: true });
    const { __mockRouter } = jest.requireMock('expo-router');
    render(<RootLayout />);
    await new Promise((r) => setTimeout(r, 50));
    expect(__mockRouter.replace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('redirects authenticated user with incomplete onboarding to /onboarding', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']);
    resetAuth({
      token: 'tok',
      user: { id: '1', email: 'a@b.com', name: 'A', onboardingComplete: false },
      hydrated: true,
    });
    const { __mockRouter } = jest.requireMock('expo-router');
    render(<RootLayout />);
    await waitFor(() =>
      expect(__mockRouter.replace).toHaveBeenCalledWith('/onboarding')
    );
  });

  it('redirects onboarding-complete user in onboarding to /(tabs)', async () => {
    mockUseSegments.mockReturnValue(['onboarding']);
    resetAuth({
      token: 'tok',
      user: { id: '1', email: 'a@b.com', name: 'A', onboardingComplete: true },
      hydrated: true,
    });
    const { __mockRouter } = jest.requireMock('expo-router');
    render(<RootLayout />);
    await waitFor(() =>
      expect(__mockRouter.replace).toHaveBeenCalledWith('/(tabs)')
    );
  });

  it('redirects authenticated+onboarded user from (auth) to /(tabs)', async () => {
    mockUseSegments.mockReturnValue(['(auth)']);
    resetAuth({
      token: 'tok',
      user: { id: '1', email: 'a@b.com', name: 'A', onboardingComplete: true },
      hydrated: true,
    });
    const { __mockRouter } = jest.requireMock('expo-router');
    render(<RootLayout />);
    await waitFor(() =>
      expect(__mockRouter.replace).toHaveBeenCalledWith('/(tabs)')
    );
  });

  it('does not redirect while hydration is pending (hydrated=false)', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']);
    resetAuth({ token: null, user: null, hydrated: false });
    const { __mockRouter } = jest.requireMock('expo-router');
    render(<RootLayout />);
    await new Promise((r) => setTimeout(r, 50));
    expect(__mockRouter.replace).not.toHaveBeenCalled();
  });
});
