import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { api } from '@/lib/api';

const TOKEN_KEY = 'cogniguard_access_token';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  onboardingComplete: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  hydrated: boolean;

  setAuth: (token: string, user: Omit<AuthUser, 'onboardingComplete'>) => Promise<void>;
  clearAuth: () => Promise<void>;
  setOnboardingComplete: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  hydrated: false,

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    // Fetch full profile to get onboardingComplete status
    try {
      const profile = await api.users.me(token);
      set({ token, user: { ...user, onboardingComplete: profile.onboardingComplete } });
    } catch {
      // If profile fetch fails, assume not onboarded yet
      set({ token, user: { ...user, onboardingComplete: false } });
    }
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null });
  },

  setOnboardingComplete: () => {
    const { user } = get();
    if (user) set({ user: { ...user, onboardingComplete: true } });
  },

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        // Re-fetch profile to get current state (including onboardingComplete)
        const profile = await api.users.me(token);
        set({
          token,
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            onboardingComplete: profile.onboardingComplete,
          },
        });
      }
    } catch {
      // Token expired or network error — clear it
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      set({ token: null, user: null });
    } finally {
      set({ isLoading: false, hydrated: true });
    }
  },
}));
