// apps/mobile/__tests__/stores/auth.store.test.ts
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: {
    auth: {
      refresh: jest.fn(),
    },
    users: {
      me: jest.fn(),
    },
  },
}));

const mockMe = api.users.me as jest.Mock;
const mockRefresh = api.auth.refresh as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.Mock;

function resetStore() {
  useAuthStore.setState({
    token: null,
    refreshToken: null,
    user: null,
    isLoading: false,
    hydrated: false,
  });
}

const fakeUser = { id: 'u1', email: 'a@b.com', name: 'Alice' };
const fakeProfile = { id: 'u1', email: 'a@b.com', name: 'Alice', onboardingCompletedAt: '2024-01-01T00:00:00.000Z' };
const fakeProfileNotOnboarded = { ...fakeProfile, onboardingCompletedAt: null };

describe('auth.store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('setAuth', () => {
    it('stores tokens in SecureStore and fetches profile', async () => {
      mockMe.mockResolvedValue(fakeProfile);
      await useAuthStore.getState().setAuth('access-123', 'refresh-456', fakeUser);

      expect(mockSetItem).toHaveBeenCalledWith('cogniguard_access_token', 'access-123');
      expect(mockSetItem).toHaveBeenCalledWith('cogniguard_refresh_token', 'refresh-456');
      const { token, refreshToken, user } = useAuthStore.getState();
      expect(token).toBe('access-123');
      expect(refreshToken).toBe('refresh-456');
      expect(user?.onboardingComplete).toBe(true);
    });

    it('derives onboardingComplete=false when onboardingCompletedAt is null', async () => {
      mockMe.mockResolvedValue(fakeProfileNotOnboarded);
      await useAuthStore.getState().setAuth('access-123', 'refresh-456', fakeUser);

      expect(useAuthStore.getState().user?.onboardingComplete).toBe(false);
    });

    it('defaults onboardingComplete to false when profile fetch fails', async () => {
      mockMe.mockRejectedValue(new Error('network'));
      await useAuthStore.getState().setAuth('access-123', 'refresh-456', fakeUser);

      expect(useAuthStore.getState().user?.onboardingComplete).toBe(false);
    });
  });

  describe('updateTokens', () => {
    it('writes new tokens to SecureStore and state', async () => {
      await useAuthStore.getState().updateTokens('new-access', 'new-refresh');
      expect(mockSetItem).toHaveBeenCalledWith('cogniguard_access_token', 'new-access');
      expect(mockSetItem).toHaveBeenCalledWith('cogniguard_refresh_token', 'new-refresh');
      const { token, refreshToken } = useAuthStore.getState();
      expect(token).toBe('new-access');
      expect(refreshToken).toBe('new-refresh');
    });
  });

  describe('clearAuth', () => {
    it('removes tokens from SecureStore and clears state', async () => {
      useAuthStore.setState({ token: 'x', refreshToken: 'y', user: { id: '1', email: 'a@b.com', name: 'A', onboardingComplete: true } });
      await useAuthStore.getState().clearAuth();
      expect(mockDeleteItem).toHaveBeenCalledWith('cogniguard_access_token');
      expect(mockDeleteItem).toHaveBeenCalledWith('cogniguard_refresh_token');
      const { token, refreshToken, user } = useAuthStore.getState();
      expect(token).toBeNull();
      expect(refreshToken).toBeNull();
      expect(user).toBeNull();
    });
  });

  describe('setOnboardingComplete', () => {
    it('sets onboardingComplete to true on existing user', () => {
      useAuthStore.setState({ user: { id: '1', email: 'a@b.com', name: 'A', onboardingComplete: false } });
      useAuthStore.getState().setOnboardingComplete();
      expect(useAuthStore.getState().user?.onboardingComplete).toBe(true);
    });

    it('does nothing when user is null', () => {
      useAuthStore.setState({ user: null });
      expect(() => useAuthStore.getState().setOnboardingComplete()).not.toThrow();
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('hydrate', () => {
    it('sets hydrated=true and populates user when access token is valid', async () => {
      mockGetItem.mockImplementation((key: string) =>
        Promise.resolve(key === 'cogniguard_access_token' ? 'stored-access' : 'stored-refresh')
      );
      mockMe.mockResolvedValue(fakeProfile);

      await useAuthStore.getState().hydrate();

      const { token, user, hydrated } = useAuthStore.getState();
      expect(hydrated).toBe(true);
      expect(token).toBe('stored-access');
      expect(user?.onboardingComplete).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('refreshes token when access token is expired (401)', async () => {
      mockGetItem.mockImplementation((key: string) =>
        Promise.resolve(key === 'cogniguard_access_token' ? 'expired' : 'refresh-token')
      );
      const expiredError = Object.assign(new Error('Unauthorized'), { status: 401 });
      mockMe
        .mockRejectedValueOnce(expiredError)
        .mockResolvedValueOnce(fakeProfile);
      mockRefresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });

      await useAuthStore.getState().hydrate();

      expect(mockRefresh).toHaveBeenCalledWith('refresh-token');
      expect(useAuthStore.getState().token).toBe('new-access');
      expect(useAuthStore.getState().user?.onboardingComplete).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('a@b.com');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('clears auth when refresh also fails', async () => {
      mockGetItem.mockImplementation((key: string) =>
        Promise.resolve(key === 'cogniguard_access_token' ? 'expired' : 'refresh-token')
      );
      const expiredError = Object.assign(new Error('Unauthorized'), { status: 401 });
      mockMe.mockRejectedValue(expiredError);
      mockRefresh.mockRejectedValue(new Error('refresh failed'));

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().hydrated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('clears auth when me() throws a non-401 error (e.g. 500)', async () => {
      mockGetItem.mockImplementation((key: string) =>
        Promise.resolve(key === 'cogniguard_access_token' ? 'stored-access' : 'stored-refresh')
      );
      mockMe.mockRejectedValue(Object.assign(new Error('Server Error'), { status: 500 }));

      await useAuthStore.getState().hydrate();

      expect(mockRefresh).not.toHaveBeenCalled();
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().hydrated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets hydrated=true with no token when SecureStore is empty', async () => {
      mockGetItem.mockResolvedValue(null);
      await useAuthStore.getState().hydrate();
      expect(useAuthStore.getState().hydrated).toBe(true);
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });
});
