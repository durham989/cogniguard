import Constants from 'expo-constants';

const getBaseUrl = () => {
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl as string;
  }
  // Derive host from Expo dev server so it works on any machine without hardcoding
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (debuggerHost) {
    return `http://${debuggerHost}`;
  }
  return 'http://localhost';
};

const BASE = getBaseUrl();

export const API = {
  user: `${BASE}:3001`,
  conversation: `${BASE}:3002`,
  exercise: `${BASE}:3003`,
} as const;

interface RequestOptions extends RequestInit {
  token?: string;
  _isRetry?: boolean;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { token, _isRetry, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...fetchOptions, headers });

  if (res.status === 401 && token && !_isRetry) {
    // Lazy import to avoid circular dependency at module init time
    const { useAuthStore } = await import('@/store/auth.store');
    const { refreshToken, updateTokens, clearAuth } = useAuthStore.getState();

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API.user}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json() as { accessToken: string; refreshToken: string };
          await updateTokens(data.accessToken, data.refreshToken);
          // Retry once with the new token
          return request<T>(url, { ...options, token: data.accessToken, _isRetry: true });
        }
      } catch {
        // Refresh request itself failed (network error)
      }
    }
    // Could not refresh — clear session
    await clearAuth();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error ?? 'Request failed') as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    register: (body: { email: string; password: string; name: string }) =>
      request<{ accessToken: string; refreshToken: string; user: { id: string; email: string; name: string } }>(
        `${API.user}/auth/register`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    login: (body: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string; user: { id: string; email: string; name: string } }>(
        `${API.user}/auth/login`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>(
        `${API.user}/auth/refresh`,
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
      ),
  },
  users: {
    me: (token: string) =>
      request<{ id: string; email: string; name: string; onboardingCompletedAt: string | null }>(
        `${API.user}/users/me`,
        { token },
      ),
    completeOnboarding: (token: string) =>
      request<void>(`${API.user}/users/me/complete-onboarding`, { method: 'POST', token }),
  },
  exercises: {
    next: (token: string) =>
      request<{
        exercise: { id: string; domain: string; type: string; name: string; systemPromptFragment: string };
        sessionId: string;
      }>(`${API.exercise}/exercises/next`, { token }),
    submit: (
      sessionId: string,
      token: string,
      body: {
        conversationId: string;
        userResponse: string;
        durationSeconds: number;
        scorePayload: { rawScore: number; normalizedScore: number; feedback: string };
      },
    ) =>
      request<{ exerciseSessionId: string; normalizedScore: number }>(
        `${API.exercise}/exercises/${sessionId}/submit`,
        { method: 'POST', token, body: JSON.stringify(body) },
      ),
    history: (token: string) =>
      request<unknown[]>(`${API.exercise}/exercises/history`, { token }),
    scoreStandalone: (
      sessionId: string,
      token: string,
      body: { userResponse: string; durationSeconds: number },
    ) =>
      request<{ exerciseSessionId: string; rawScore: number; normalizedScore: number; domain: string; feedback: string }>(
        `${API.exercise}/exercises/${sessionId}/score-standalone`,
        { method: 'POST', token, body: JSON.stringify(body) },
      ),
    stats: (token: string) =>
      request<{
        streak: number;
        level: number;
        levelLabel: string;
        nextLevelAt: number | null;
        domainBadges: Record<string, 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'>;
      }>(`${API.exercise}/exercises/stats`, { token }),
    trends: (token: string) =>
      request<Array<{ domain: string; weeks: Array<{ weekStart: string; avg: number; count: number }> }>>(
        `${API.exercise}/exercises/trends`,
        { token },
      ),
  },
  conversations: {
    list: (token: string) =>
      request<Array<{ id: string; name: string | null; state: string; startedAt: string }>>(
        `${API.conversation}/conversations`,
        { token },
      ),
    create: (token: string) =>
      request<{ id: string }>(`${API.conversation}/conversations`, {
        method: 'POST',
        token,
      }),
    latest: (token: string) =>
      request<{ id: string; state: string } | null>(
        `${API.conversation}/conversations/latest`,
        { token },
      ),
    messages: (conversationId: string, token: string) =>
      request<Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: string }>>(
        `${API.conversation}/conversations/${conversationId}/messages`,
        { token },
      ),
  },
};
