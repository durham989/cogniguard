import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { api } from '@/lib/api';

const ACCESS_KEY = 'cogniguard_access_token';
const REFRESH_KEY = 'cogniguard_refresh_token';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  onboardingComplete: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  hydrated: boolean;

  setAuth: (accessToken: string, refreshToken: string, user: Omit<AuthUser, 'onboardingComplete'>) => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setOnboardingComplete: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  isLoading: false,
  hydrated: false,

  setAuth: async (accessToken, refreshToken, user) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
    try {
      const profile = await api.users.me(accessToken);
      set({ token: accessToken, refreshToken, user: { ...user, onboardingComplete: profile.onboardingComplete } });
    } catch {
      set({ token: accessToken, refreshToken, user: { ...user, onboardingComplete: false } });
    }
  },

  updateTokens: async (accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
    set({ token: accessToken, refreshToken });
  },

  clearAuth: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]).catch(() => {});
    set({ token: null, refreshToken: null, user: null });
  },

  setOnboardingComplete: () => {
    const { user } = get();
    if (user) set({ user: { ...user, onboardingComplete: true } });
  },

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
      ]);
      if (accessToken) {
        try {
          const profile = await api.users.me(accessToken);
          set({
            token: accessToken,
            refreshToken,
            user: {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              onboardingComplete: profile.onboardingComplete,
            },
          });
        } catch (err: any) {
          // Access token expired — try refresh
          if (err.status === 401 && refreshToken) {
            try {
              const { accessToken: newAccess, refreshToken: newRefresh } =
                await api.auth.refresh(refreshToken);
              await Promise.all([
                SecureStore.setItemAsync(ACCESS_KEY, newAccess),
                SecureStore.setItemAsync(REFRESH_KEY, newRefresh),
              ]);
              const profile = await api.users.me(newAccess);
              set({
                token: newAccess,
                refreshToken: newRefresh,
                user: {
                  id: profile.id,
                  email: profile.email,
                  name: profile.name,
                  onboardingComplete: profile.onboardingComplete,
                },
              });
            } catch {
              // Refresh also failed — clear everything
              await get().clearAuth();
            }
          } else {
            await get().clearAuth();
          }
        }
      }
    } catch {
      // SecureStore unavailable (web) — stay unauthenticated
    } finally {
      set({ isLoading: false, hydrated: true });
    }
  },
}));
