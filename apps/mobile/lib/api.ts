import Constants from 'expo-constants';

// In development, use localhost for iOS simulator / Android emulator
// Android emulator uses 10.0.2.2 to reach host machine
const getBaseUrl = () => {
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl as string;
  }
  // Default to localhost for dev
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
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...fetchOptions, headers });

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
      request<{ accessToken: string; user: { id: string; email: string; name: string } }>(
        `${API.user}/auth/register`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    login: (body: { email: string; password: string }) =>
      request<{ accessToken: string; user: { id: string; email: string; name: string } }>(
        `${API.user}/auth/login`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
  },
  users: {
    me: (token: string) =>
      request<{ id: string; email: string; name: string; onboardingComplete: boolean }>(
        `${API.user}/users/me`,
        { token },
      ),
  },
  exercises: {
    next: (token: string) =>
      request<{ exercise: { id: string; domain: string; type: string; name: string }; sessionId: string }>(
        `${API.exercise}/exercises/next`,
        { token },
      ),
    history: (token: string) =>
      request<unknown[]>(`${API.exercise}/exercises/history`, { token }),
  },
  conversations: {
    create: (token: string) =>
      request<{ id: string }>(`${API.conversation}/conversations`, {
        method: 'POST',
        token,
      }),
    messages: (conversationId: string, token: string) =>
      request<unknown[]>(`${API.conversation}/conversations/${conversationId}/messages`, { token }),
  },
};
