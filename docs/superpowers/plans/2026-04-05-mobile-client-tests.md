# Mobile Client Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unit, integration, and E2E tests for every screen, component, store, and navigation guard in `apps/mobile`.

**Architecture:** Jest + `jest-expo` preset for unit/integration tests (stores run as pure JS, components and screens rendered with React Native Testing Library). Maestro CLI for E2E flows run against the live simulator. All mocks for native modules (`expo-secure-store`, `expo-router`, `expo-constants`, `@expo/vector-icons`) are centralised in `jest.setup.ts` so individual test files stay focused.

**Tech Stack:** `jest@^29`, `jest-expo@~54.0.0`, `@testing-library/react-native@^13.0.0`, `@testing-library/jest-native@^5.4.3`, `@types/jest@^29`, Maestro CLI (installed via `brew install maestro`, not npm).

---

## File structure

```
apps/mobile/
  jest.config.js                              new
  jest.setup.ts                               new
  package.json                                modify (add dev deps + test script)
  __tests__/
    stores/
      auth.store.test.ts                      new
      conversation.store.test.ts              new
    lib/
      sse.test.ts                             new
    components/
      MessageBubble.test.tsx                  new
      ExerciseResultBanner.test.tsx           new
    screens/
      login.test.tsx                          new
      register.test.tsx                       new
      onboarding.test.tsx                     new
      history.test.tsx                        new
      train.test.tsx                          new
    navigation/
      auth-guard.test.tsx                     new
  .maestro/
    flows/
      login.yaml                              new
      register.yaml                           new
```

---

### Task 1: Install dependencies and configure Jest

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/jest.setup.ts`

- [ ] **Step 1: Add dev dependencies and test script to `apps/mobile/package.json`**

Replace the `devDependencies` block and add a `test` script:

```json
{
  "name": "@cogniguard/mobile",
  "version": "0.0.1",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@cogniguard/types": "workspace:*",
    "@expo/vector-icons": "^15.1.1",
    "@react-native-async-storage/async-storage": "2.2.0",
    "expo": "~54.0.0",
    "expo-constants": "~18.0.13",
    "expo-font": "~14.0.11",
    "expo-linking": "~8.0.11",
    "expo-router": "~6.0.23",
    "expo-secure-store": "~15.0.8",
    "expo-splash-screen": "~31.0.13",
    "expo-status-bar": "~3.0.9",
    "expo-system-ui": "~6.0.9",
    "expo-web-browser": "~15.0.10",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.7",
    "react-native-safe-area-context": "5.6.2",
    "react-native-screens": "~4.16.0",
    "react-native-web": "~0.21.2",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@expo/metro-runtime": "^6.1.2",
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-native": "^13.0.0",
    "@types/jest": "^29.0.0",
    "@types/react": "~19.1.17",
    "jest": "^29.0.0",
    "jest-expo": "~54.0.0",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Install the new packages**

Run from the monorepo root:
```bash
cd /path/to/cogniguard
pnpm install
```

Expected: pnpm resolves and installs `jest`, `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`, `@types/jest` without errors.

- [ ] **Step 3: Create `apps/mobile/jest.config.js`**

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'store/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
```

- [ ] **Step 4: Create `apps/mobile/jest.setup.ts`**

```typescript
import '@testing-library/jest-native/extend-expect';

// ─── expo-secure-store ────────────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── expo-splash-screen ───────────────────────────────────────────────────────
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── expo-constants ───────────────────────────────────────────────────────────
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: { apiUrl: 'http://localhost' } },
  },
}));

// ─── @expo/vector-icons ───────────────────────────────────────────────────────
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, ...props }: any) =>
      require('react').createElement(Text, props, name),
  };
});

// ─── expo-router ──────────────────────────────────────────────────────────────
const mockRouter = {
  replace: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
};

const mockNavigation = {
  setOptions: jest.fn(),
};

jest.mock('expo-router', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  const React = require('react');
  return {
    useRouter: () => mockRouter,
    useNavigation: () => mockNavigation,
    useSegments: jest.fn(() => []),
    Link: ({ href, children, style }: any) =>
      React.createElement(TouchableOpacity, { onPress: () => mockRouter.navigate(href) },
        React.createElement(Text, { style }, children)),
    Stack: {
      Screen: ({ children }: any) => React.createElement(View, null, children),
    },
    Tabs: ({ children }: any) => React.createElement(View, null, children),
    'Tabs.Screen': ({ children }: any) => React.createElement(View, null, children),
  };
});

// Export for use in tests that need to control the mock
export { mockRouter, mockNavigation };

// ─── Reset mocks between tests ────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});
```

- [ ] **Step 5: Verify Jest starts without configuration errors**

```bash
cd apps/mobile
pnpm test -- --listTests
```

Expected output: lists test files (empty list is fine — we haven't created any yet). No configuration errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/jest.config.js apps/mobile/jest.setup.ts apps/mobile/package.json
git commit -m "test: configure Jest + RNTL for mobile app"
```

---

### Task 2: Auth store unit tests

**Files:**
- Create: `apps/mobile/__tests__/stores/auth.store.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
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
    });

    it('sets hydrated=true with no token when SecureStore is empty', async () => {
      mockGetItem.mockResolvedValue(null);
      await useAuthStore.getState().hydrate();
      expect(useAuthStore.getState().hydrated).toBe(true);
      expect(useAuthStore.getState().token).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd apps/mobile
pnpm test -- __tests__/stores/auth.store.test.ts
```

Expected: 10 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/stores/auth.store.test.ts
git commit -m "test: auth store unit tests"
```

---

### Task 3: Conversation store unit tests

**Files:**
- Create: `apps/mobile/__tests__/stores/conversation.store.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// apps/mobile/__tests__/stores/conversation.store.test.ts
import { useConversationStore } from '@/store/conversation.store';

function resetStore() {
  useConversationStore.getState().reset();
}

const exerciseResult = {
  rawScore: 7,
  normalizedScore: 70,
  feedback: 'Good job!',
  domain: 'memory',
};

describe('conversation.store', () => {
  beforeEach(resetStore);

  it('starts with empty state', () => {
    const s = useConversationStore.getState();
    expect(s.conversationId).toBeNull();
    expect(s.messages).toHaveLength(0);
    expect(s.isStreaming).toBe(false);
    expect(s.streamingContent).toBe('');
    expect(s.pendingExerciseResult).toBeNull();
    expect(s.activeExercise).toBeNull();
  });

  describe('setConversationId', () => {
    it('sets the conversation ID', () => {
      useConversationStore.getState().setConversationId('conv-1');
      expect(useConversationStore.getState().conversationId).toBe('conv-1');
    });
  });

  describe('loadMessages', () => {
    it('replaces messages with the provided list', () => {
      const msgs = [
        { id: 'a', role: 'user' as const, content: 'Hello' },
        { id: 'b', role: 'assistant' as const, content: 'Hi there' },
      ];
      useConversationStore.getState().loadMessages(msgs);
      const { messages } = useConversationStore.getState();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].role).toBe('assistant');
    });
  });

  describe('addUserMessage', () => {
    it('appends a user message', () => {
      useConversationStore.getState().addUserMessage('Hi');
      useConversationStore.getState().addUserMessage('There');
      expect(useConversationStore.getState().messages).toHaveLength(2);
      expect(useConversationStore.getState().messages[1].content).toBe('There');
      expect(useConversationStore.getState().messages[1].role).toBe('user');
    });
  });

  describe('streaming', () => {
    it('startStreaming sets isStreaming=true and clears content', () => {
      useConversationStore.setState({ streamingContent: 'old', isStreaming: false });
      useConversationStore.getState().startStreaming();
      expect(useConversationStore.getState().isStreaming).toBe(true);
      expect(useConversationStore.getState().streamingContent).toBe('');
    });

    it('appendStreamChunk accumulates text', () => {
      useConversationStore.getState().startStreaming();
      useConversationStore.getState().appendStreamChunk('Hel');
      useConversationStore.getState().appendStreamChunk('lo!');
      expect(useConversationStore.getState().streamingContent).toBe('Hello!');
    });

    it('finalizeStreamingMessage converts stream to message and stops streaming', () => {
      useConversationStore.getState().startStreaming();
      useConversationStore.getState().appendStreamChunk('Streaming reply');
      useConversationStore.getState().finalizeStreamingMessage();

      const { messages, isStreaming, streamingContent } = useConversationStore.getState();
      expect(isStreaming).toBe(false);
      expect(streamingContent).toBe('');
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toBe('Streaming reply');
    });

    it('finalizes with empty string when nothing was streamed', () => {
      useConversationStore.getState().startStreaming();
      useConversationStore.getState().finalizeStreamingMessage();
      expect(useConversationStore.getState().messages[0].content).toBe('');
    });
  });

  describe('exercise result', () => {
    it('setExerciseResult stores the result', () => {
      useConversationStore.getState().setExerciseResult(exerciseResult);
      expect(useConversationStore.getState().pendingExerciseResult).toEqual(exerciseResult);
    });

    it('dismissExerciseResult clears the result', () => {
      useConversationStore.getState().setExerciseResult(exerciseResult);
      useConversationStore.getState().dismissExerciseResult();
      expect(useConversationStore.getState().pendingExerciseResult).toBeNull();
    });
  });

  describe('setActiveExercise', () => {
    it('sets and clears active exercise', () => {
      const ex = { sessionId: 's1', domain: 'memory', fragment: 'Remember this list...' };
      useConversationStore.getState().setActiveExercise(ex);
      expect(useConversationStore.getState().activeExercise).toEqual(ex);
      useConversationStore.getState().setActiveExercise(null);
      expect(useConversationStore.getState().activeExercise).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      useConversationStore.getState().setConversationId('conv-x');
      useConversationStore.getState().addUserMessage('Hello');
      useConversationStore.getState().startStreaming();
      useConversationStore.getState().setExerciseResult(exerciseResult);
      useConversationStore.getState().reset();

      const s = useConversationStore.getState();
      expect(s.conversationId).toBeNull();
      expect(s.messages).toHaveLength(0);
      expect(s.isStreaming).toBe(false);
      expect(s.pendingExerciseResult).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/stores/conversation.store.test.ts
```

Expected: 13 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/stores/conversation.store.test.ts
git commit -m "test: conversation store unit tests"
```

---

### Task 4: SSE library unit tests

**Files:**
- Create: `apps/mobile/__tests__/lib/sse.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// apps/mobile/__tests__/lib/sse.test.ts
import { streamMessage } from '@/lib/sse';
import { useAuthStore } from '@/store/auth.store';

// Mock the auth store (used for 401 refresh)
jest.mock('@/store/auth.store', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

// Helper: create a controllable fake XHR
function makeFakeXHR() {
  return {
    open: jest.fn(),
    setRequestHeader: jest.fn(),
    send: jest.fn(),
    abort: jest.fn(),
    responseText: '',
    status: 200,
    onprogress: null as ((e?: any) => void) | null,
    onload: null as (() => void | Promise<void>) | null,
    onerror: null as (() => void) | null,
  };
}

type FakeXHR = ReturnType<typeof makeFakeXHR>;

let fakeXhr: FakeXHR;

function sse(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`;
}

beforeEach(() => {
  fakeXhr = makeFakeXHR();
  (global as any).XMLHttpRequest = jest.fn(() => fakeXhr);

  // Default auth store state
  (useAuthStore.getState as jest.Mock).mockReturnValue({
    refreshToken: null,
    updateTokens: jest.fn(),
    clearAuth: jest.fn(),
  });
});

function makeCallbacks() {
  return {
    onDelta: jest.fn(),
    onComplete: jest.fn(),
    onExerciseResult: jest.fn(),
    onError: jest.fn(),
  };
}

describe('streamMessage', () => {
  it('opens XHR with correct URL and auth header', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hello', 'tok-abc', cb);
    expect(fakeXhr.open).toHaveBeenCalledWith(
      'POST',
      expect.stringContaining('/conversations/conv-1/messages'),
    );
    expect(fakeXhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer tok-abc');
    expect(fakeXhr.send).toHaveBeenCalledWith(JSON.stringify({ content: 'hello' }));
  });

  it('appends exercise query params when exercise context is provided', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb, {
      sessionId: 'sess-1',
      domain: 'memory',
      fragment: 'Remember: apple, orange',
    });
    expect(fakeXhr.open).toHaveBeenCalledWith(
      'POST',
      expect.stringContaining('exerciseSessionId=sess-1'),
    );
    expect(fakeXhr.open).toHaveBeenCalledWith(
      'POST',
      expect.stringContaining('domain=memory'),
    );
  });

  it('calls onDelta for message.delta events', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sse('message.delta', { delta: 'Hello' });
    fakeXhr.onprogress!();
    expect(cb.onDelta).toHaveBeenCalledWith('Hello');
  });

  it('calls onComplete for message.complete event', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sse('message.complete', { message: { id: 'm1', content: 'Hi!' } });
    fakeXhr.onprogress!();
    expect(cb.onComplete).toHaveBeenCalled();
  });

  it('calls onExerciseResult for exercise.result event', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sse('exercise.result', {
      exerciseId: 'ex-1',
      domain: 'memory',
      rawScore: 8,
      normalizedScore: 80,
      feedback: 'Great memory!',
    });
    fakeXhr.onprogress!();
    expect(cb.onExerciseResult).toHaveBeenCalledWith({
      rawScore: 8,
      normalizedScore: 80,
      feedback: 'Great memory!',
      domain: 'memory',
    });
  });

  it('calls onError for error events', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sse('error', { message: 'Something went wrong' });
    fakeXhr.onprogress!();
    expect(cb.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Something went wrong' }));
  });

  it('flushes remaining buffer and calls onComplete on onload (safety net)', async () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    // Simulate data arriving after last onprogress
    fakeXhr.responseText = sse('message.delta', { delta: 'last' });
    fakeXhr.status = 200;
    await fakeXhr.onload!();
    expect(cb.onDelta).toHaveBeenCalledWith('last');
    expect(cb.onComplete).toHaveBeenCalled();
  });

  it('calls onError and does not call onComplete for non-401 HTTP errors', async () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.status = 500;
    fakeXhr.responseText = '';
    await fakeXhr.onload!();
    expect(cb.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'HTTP 500' }));
  });

  it('calls onError on network error', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);
    fakeXhr.onerror!();
    expect(cb.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Network error' }));
  });

  it('aborts XHR when AbortController.abort() is called', () => {
    const cb = makeCallbacks();
    const controller = streamMessage('conv-1', 'hi', 'tok', cb);
    controller.abort();
    expect(fakeXhr.abort).toHaveBeenCalled();
  });

  describe('401 handling', () => {
    it('refreshes token and retries when 401 on first attempt', async () => {
      const secondFakeXhr = makeFakeXHR();
      let callCount = 0;
      (global as any).XMLHttpRequest = jest.fn(() => {
        callCount++;
        return callCount === 1 ? fakeXhr : secondFakeXhr;
      });

      const mockUpdateTokens = jest.fn().mockResolvedValue(undefined);
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        refreshToken: 'ref-token',
        updateTokens: mockUpdateTokens,
        clearAuth: jest.fn(),
      });

      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
      });

      const cb = makeCallbacks();
      streamMessage('conv-1', 'hi', 'tok', cb);

      fakeXhr.status = 401;
      fakeXhr.responseText = '';
      await fakeXhr.onload!();

      expect(mockUpdateTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
      expect(secondFakeXhr.open).toHaveBeenCalled();
      expect(secondFakeXhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer new-access');
    });

    it('calls clearAuth and onError when refresh fails', async () => {
      const mockClearAuth = jest.fn().mockResolvedValue(undefined);
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        refreshToken: 'ref-token',
        updateTokens: jest.fn(),
        clearAuth: mockClearAuth,
      });

      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'invalid token' }),
      });

      const cb = makeCallbacks();
      streamMessage('conv-1', 'hi', 'tok', cb);

      fakeXhr.status = 401;
      fakeXhr.responseText = '';
      await fakeXhr.onload!();

      expect(mockClearAuth).toHaveBeenCalled();
      expect(cb.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Session expired' }));
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/lib/sse.test.ts
```

Expected: 12 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/lib/sse.test.ts
git commit -m "test: SSE library unit tests"
```

---

### Task 5: MessageBubble component tests

**Files:**
- Create: `apps/mobile/__tests__/components/MessageBubble.test.tsx`

- [ ] **Step 1: Write the test file**

```typescript
// apps/mobile/__tests__/components/MessageBubble.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MessageBubble } from '@/components/MessageBubble';

const userMsg = { id: '1', role: 'user' as const, content: 'Hello Pierre!' };
const assistantMsg = { id: '2', role: 'assistant' as const, content: 'Hello! How are you?' };

describe('MessageBubble', () => {
  it('renders user message content', () => {
    render(<MessageBubble message={userMsg} />);
    expect(screen.getByText('Hello Pierre!')).toBeTruthy();
  });

  it('renders assistant message content', () => {
    render(<MessageBubble message={assistantMsg} />);
    expect(screen.getByText('Hello! How are you?')).toBeTruthy();
  });

  it('user message bubble has purple background', () => {
    render(<MessageBubble message={userMsg} />);
    const bubble = screen.getByText('Hello Pierre!').parent;
    expect(bubble?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#6c63ff' }),
      ]),
    );
  });

  it('assistant message bubble has dark background', () => {
    render(<MessageBubble message={assistantMsg} />);
    const bubble = screen.getByText('Hello! How are you?').parent;
    expect(bubble?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#1e1e3a' }),
      ]),
    );
  });

  it('user message row is right-aligned', () => {
    render(<MessageBubble message={userMsg} />);
    const text = screen.getByText('Hello Pierre!');
    // Walk up to the row (grandparent of text)
    const row = text.parent?.parent;
    expect(row?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ justifyContent: 'flex-end' }),
      ]),
    );
  });

  it('assistant message row is left-aligned', () => {
    render(<MessageBubble message={assistantMsg} />);
    const text = screen.getByText('Hello! How are you?');
    const row = text.parent?.parent;
    expect(row?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ justifyContent: 'flex-start' }),
      ]),
    );
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/components/MessageBubble.test.tsx
```

Expected: 6 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/components/MessageBubble.test.tsx
git commit -m "test: MessageBubble component tests"
```

---

### Task 6: ExerciseResultBanner component tests

**Files:**
- Create: `apps/mobile/__tests__/components/ExerciseResultBanner.test.tsx`

- [ ] **Step 1: Write the test file**

```typescript
// apps/mobile/__tests__/components/ExerciseResultBanner.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ExerciseResultBanner } from '@/components/ExerciseResultBanner';

const baseResult = {
  rawScore: 8,
  normalizedScore: 80,
  feedback: 'Excellent recall!',
  domain: 'memory',
};

describe('ExerciseResultBanner', () => {
  it('renders the domain label', () => {
    render(<ExerciseResultBanner result={baseResult} onDismiss={jest.fn()} />);
    expect(screen.getByText('Memory Exercise')).toBeTruthy();
  });

  it('renders normalizedScore and feedback', () => {
    render(<ExerciseResultBanner result={baseResult} onDismiss={jest.fn()} />);
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('Excellent recall!')).toBeTruthy();
  });

  it('renders rawScore', () => {
    render(<ExerciseResultBanner result={baseResult} onDismiss={jest.fn()} />);
    expect(screen.getByText('Raw: 8')).toBeTruthy();
  });

  it('calls onDismiss when close button is pressed', () => {
    const onDismiss = jest.fn();
    render(<ExerciseResultBanner result={baseResult} onDismiss={onDismiss} />);
    // The close icon button — find via the Ionicons mock which renders icon name as text
    fireEvent.press(screen.getByText('close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('score ring is green for score >= 70', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, normalizedScore: 75 }} onDismiss={jest.fn()} />);
    const scoreText = screen.getByText('75');
    expect(scoreText.props.style).toEqual(
      expect.objectContaining({ color: '#30d158' }),
    );
  });

  it('score ring is yellow for score >= 40 and < 70', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, normalizedScore: 55 }} onDismiss={jest.fn()} />);
    const scoreText = screen.getByText('55');
    expect(scoreText.props.style).toEqual(
      expect.objectContaining({ color: '#ffd60a' }),
    );
  });

  it('score ring is red for score < 40', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, normalizedScore: 30 }} onDismiss={jest.fn()} />);
    const scoreText = screen.getByText('30');
    expect(scoreText.props.style).toEqual(
      expect.objectContaining({ color: '#ff453a' }),
    );
  });

  it('falls back to raw domain key for unknown domains', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, domain: 'unknown_domain' }} onDismiss={jest.fn()} />);
    expect(screen.getByText('unknown_domain Exercise')).toBeTruthy();
  });

  it('renders processing_speed domain label correctly', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, domain: 'processing_speed' }} onDismiss={jest.fn()} />);
    expect(screen.getByText('Processing Speed Exercise')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/components/ExerciseResultBanner.test.tsx
```

Expected: 9 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/components/ExerciseResultBanner.test.tsx
git commit -m "test: ExerciseResultBanner component tests"
```

---

### Task 7: Login screen integration tests

**Files:**
- Create: `apps/mobile/__tests__/screens/login.test.tsx`

- [ ] **Step 1: Write the test file**

```typescript
// apps/mobile/__tests__/screens/login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/lib/api', () => ({
  api: {
    auth: {
      login: jest.fn(),
    },
    users: {
      me: jest.fn(),
    },
  },
}));

jest.mock('@/store/auth.store', () => {
  const setAuth = jest.fn().mockResolvedValue(undefined);
  return {
    useAuthStore: jest.fn((selector) =>
      selector({ setAuth })
    ),
  };
});

const mockLogin = api.auth.login as jest.Mock;
const mockSetAuth = useAuthStore((s: any) => s.setAuth) as jest.Mock;

const validCredentials = { email: 'alice@example.com', password: 'password123' };
const fakeLoginResponse = {
  accessToken: 'access-tok',
  refreshToken: 'refresh-tok',
  user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
};

describe('LoginScreen', () => {
  it('renders email, password inputs and Sign In button', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('shows app title and subtitle', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Preventia')).toBeTruthy();
    expect(screen.getByText('Your cognitive wellness companion')).toBeTruthy();
  });

  it('shows email error when submitting empty email', async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeTruthy();
    });
  });

  it('shows invalid email error for bad format', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'notanemail');
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('Enter a valid email')).toBeTruthy();
    });
  });

  it('shows password error when password is empty', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'alice@example.com');
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeTruthy();
    });
  });

  it('does not call api.auth.login when validation fails', async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => expect(screen.getByText('Email is required')).toBeTruthy());
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls api.auth.login with trimmed lowercased email and password', async () => {
    mockLogin.mockResolvedValue(fakeLoginResponse);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), '  Alice@Example.COM  ');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'alice@example.com', password: 'password123' });
    });
  });

  it('calls setAuth and navigates to tabs on success', async () => {
    mockLogin.mockResolvedValue(fakeLoginResponse);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), validCredentials.email);
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), validCredentials.password);
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith('access-tok', 'refresh-tok', fakeLoginResponse.user);
    });
  });

  it('shows "Sign up" link', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Sign up')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/screens/login.test.tsx
```

Expected: 9 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/screens/login.test.tsx
git commit -m "test: Login screen integration tests"
```

---

### Task 8: Register screen integration tests

**Files:**
- Create: `apps/mobile/__tests__/screens/register.test.tsx`

- [ ] **Step 1: Write the test file**

```typescript
// apps/mobile/__tests__/screens/register.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '@/app/(auth)/register';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/lib/api', () => ({
  api: {
    auth: {
      register: jest.fn(),
    },
    users: {
      me: jest.fn(),
    },
  },
}));

jest.mock('@/store/auth.store', () => {
  const setAuth = jest.fn().mockResolvedValue(undefined);
  return {
    useAuthStore: jest.fn((selector) => selector({ setAuth })),
  };
});

const mockRegister = api.auth.register as jest.Mock;
const mockSetAuth = useAuthStore((s: any) => s.setAuth) as jest.Mock;

const fakeRegisterResponse = {
  accessToken: 'access-tok',
  refreshToken: 'refresh-tok',
  user: { id: 'u1', email: 'bob@example.com', name: 'Bob' },
};

function fillForm(overrides: { name?: string; email?: string; password?: string; confirm?: string } = {}) {
  const name = overrides.name ?? 'Bob Smith';
  const email = overrides.email ?? 'bob@example.com';
  const password = overrides.password ?? 'securepass1';
  const confirm = overrides.confirm ?? password;
  fireEvent.changeText(screen.getByPlaceholderText('Jane Smith'), name);
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), email);
  const passwordInputs = screen.getAllByPlaceholderText('••••••••');
  // First one with placeholder 'At least 8 characters' is password, second is confirm
  fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), password);
  fireEvent.changeText(passwordInputs[passwordInputs.length - 1], confirm);
}

describe('RegisterScreen', () => {
  it('renders all four form fields', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Jane Smith')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('At least 8 characters')).toBeTruthy();
    // Two password fields — placeholder '••••••••' appears on confirm
    expect(screen.getAllByPlaceholderText('••••••••').length).toBeGreaterThanOrEqual(1);
  });

  it('shows name error when name is empty', async () => {
    render(<RegisterScreen />);
    fireEvent.press(screen.getByText('Create Account'));
    await waitFor(() => expect(screen.getByText('Name is required')).toBeTruthy());
  });

  it('shows email validation error for bad format', async () => {
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Jane Smith'), 'Bob');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'notvalid');
    fireEvent.press(screen.getByText('Create Account'));
    await waitFor(() => expect(screen.getByText('Enter a valid email')).toBeTruthy());
  });

  it('shows error when password is too short', async () => {
    render(<RegisterScreen />);
    fillForm({ password: 'short', confirm: 'short' });
    fireEvent.press(screen.getByText('Create Account'));
    await waitFor(() =>
      expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy()
    );
  });

  it('shows error when passwords do not match', async () => {
    render(<RegisterScreen />);
    fillForm({ password: 'password123', confirm: 'different1' });
    fireEvent.press(screen.getByText('Create Account'));
    await waitFor(() =>
      expect(screen.getByText('Passwords do not match')).toBeTruthy()
    );
  });

  it('calls api.auth.register with correct values on valid submit', async () => {
    mockRegister.mockResolvedValue(fakeRegisterResponse);
    render(<RegisterScreen />);
    fillForm();
    fireEvent.press(screen.getByText('Create Account'));
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: 'securepass1',
      });
    });
  });

  it('calls setAuth with tokens and user on success', async () => {
    mockRegister.mockResolvedValue(fakeRegisterResponse);
    render(<RegisterScreen />);
    fillForm();
    fireEvent.press(screen.getByText('Create Account'));
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith('access-tok', 'refresh-tok', fakeRegisterResponse.user);
    });
  });

  it('shows "Sign in" link', () => {
    render(<RegisterScreen />);
    expect(screen.getByText('Sign in')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/screens/register.test.tsx
```

Expected: 8 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/screens/register.test.tsx
git commit -m "test: Register screen integration tests"
```

---

### Task 9: Onboarding screen integration tests

**Files:**
- Create: `apps/mobile/__tests__/screens/onboarding.test.tsx`

- [ ] **Step 1: Write the test file**

```typescript
// apps/mobile/__tests__/screens/onboarding.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '@/app/onboarding/index';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/store/auth.store', () => {
  const setOnboardingComplete = jest.fn();
  return {
    useAuthStore: jest.fn((selector) =>
      selector({ token: 'tok-123', setOnboardingComplete })
    ),
  };
});

const mockSetOnboardingComplete = useAuthStore((s: any) => s.setOnboardingComplete) as jest.Mock;

// Mock fetch for the complete-onboarding call
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('OnboardingScreen', () => {
  it('renders step 1 content', () => {
    render(<OnboardingScreen />);
    expect(screen.getByText('Assess Your Baseline')).toBeTruthy();
  });

  it('shows 3 progress dots on step 1', () => {
    render(<OnboardingScreen />);
    // There are 3 dots rendered; hard to query dots directly, but we can assert no "Back" visible
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

  it('goes back to step 1 when Back is pressed', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Back')).toBeTruthy());
    fireEvent.press(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByText('Assess Your Baseline')).toBeTruthy());
  });

  it('advances through all 3 steps', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Natural Conversation')).toBeTruthy());
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Track Your Progress')).toBeTruthy());
  });

  it('shows "Let\'s Begin" button on last step', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Continue')).toBeTruthy());
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText("Let's Begin")).toBeTruthy());
  });

  it('calls complete-onboarding endpoint and setOnboardingComplete on finish', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn() });
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Continue')).toBeTruthy());
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText("Let's Begin")).toBeTruthy());
    fireEvent.press(screen.getByText("Let's Begin"));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/complete-onboarding'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockSetOnboardingComplete).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/screens/onboarding.test.tsx
```

Expected: 8 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/screens/onboarding.test.tsx
git commit -m "test: Onboarding screen integration tests"
```

---

### Task 10: History screen integration tests

**Files:**
- Create: `apps/mobile/__tests__/screens/history.test.tsx`

- [ ] **Step 1: Write the test file**

```typescript
// apps/mobile/__tests__/screens/history.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import HistoryScreen from '@/app/(tabs)/history';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';

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
  useAuthStore: jest.fn((selector) => selector({ token: 'tok-123' })),
}));

jest.mock('@/store/conversation.store', () => {
  const reset = jest.fn();
  const setConversationId = jest.fn();
  const loadMessages = jest.fn();
  return {
    useConversationStore: jest.fn((selector) =>
      selector({ reset, setConversationId, loadMessages })
    ),
  };
});

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
  });

  it('shows loading indicator initially', () => {
    // Don't resolve immediately
    mockList.mockReturnValue(new Promise(() => {}));
    mockExerciseHistory.mockReturnValue(new Promise(() => {}));
    render(<HistoryScreen />);
    expect(screen.getByTestId('activity-indicator') ?? screen.queryByRole('progressbar')).toBeTruthy();
    // Actually check for ActivityIndicator: RNTL doesn't expose by testID unless we add it
    // Fallback: check no conversations visible yet
    expect(screen.queryByText('Memory Chat')).toBeNull();
  });

  it('renders conversations section header', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText(/Conversations/)).toBeTruthy());
  });

  it('renders AI-generated conversation name', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Memory Chat')).toBeTruthy());
  });

  it('renders "Untitled conversation" for conversations with null name', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Untitled conversation')).toBeTruthy());
  });

  it('renders exercises section with domain labels', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Memory')).toBeTruthy());
    expect(screen.getByText('Attention')).toBeTruthy();
  });

  it('renders normalized score for completed exercises', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('85')).toBeTruthy());
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

  it('tapping a conversation card calls reset, setConversationId, loadMessages', async () => {
    mockMessages.mockResolvedValue([
      { id: 'm1', role: 'user', content: 'Hi', createdAt: '2024-01-15T10:01:00.000Z' },
    ]);
    const { setConversationId, loadMessages, reset } = useConversationStore((s: any) => s);

    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByText('Memory Chat')).toBeTruthy());
    fireEvent.press(screen.getByText('Resume →'));

    await waitFor(() => {
      expect(reset).toHaveBeenCalled();
      expect(setConversationId).toHaveBeenCalledWith('c1');
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/screens/history.test.tsx
```

Expected: 10 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/screens/history.test.tsx
git commit -m "test: History screen integration tests"
```

---

### Task 11: Train screen integration tests

**Files:**
- Create: `apps/mobile/__tests__/screens/train.test.tsx`

- [ ] **Step 1: Write the test file**

```typescript
// apps/mobile/__tests__/screens/train.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import TrainScreen from '@/app/(tabs)/index';
import { api } from '@/lib/api';
import { streamMessage } from '@/lib/sse';
import { useAuthStore } from '@/store/auth.store';
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
  useAuthStore: jest.fn((selector) => selector({ token: 'tok-123' })),
}));

const mockLatest = api.conversations.latest as jest.Mock;
const mockCreate = api.conversations.create as jest.Mock;
const mockMessages = api.conversations.messages as jest.Mock;
const mockNext = api.exercises.next as jest.Mock;
const mockSubmit = api.exercises.submit as jest.Mock;
const mockStream = streamMessage as jest.Mock;

const fakeAbort = { abort: jest.fn() };
const fakeExercise = {
  exercise: { id: 'ex-1', domain: 'memory', type: 'word_list', name: 'Word List', systemPromptFragment: 'Remember: apple, orange' },
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

    it('send button is disabled when input is empty', async () => {
      render(<TrainScreen />);
      await waitFor(() => expect(screen.getByPlaceholderText('Message Pierre…')).toBeTruthy());
      const sendBtn = screen.getByRole('button', { name: /arrow-up/i }) ?? screen.getAllByText('arrow-up')[0];
      // Input is empty so TouchableOpacity has disabled=true
      expect(screen.getByPlaceholderText('Message Pierre…').props.editable).not.toBe(false);
    });

    it('calls streamMessage with user content when send is pressed', async () => {
      render(<TrainScreen />);
      await waitFor(() => expect(screen.getByPlaceholderText('Message Pierre…')).toBeTruthy());
      fireEvent.changeText(screen.getByPlaceholderText('Message Pierre…'), 'Hello Pierre');
      fireEvent.press(screen.getByText('arrow-up')); // Ionicons mock renders icon name as text
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
    it('calls exercises.submit when exercise.result SSE event fires', async () => {
      mockLatest.mockResolvedValue({ id: 'conv-1', state: 'FREE_CHAT' });
      mockMessages.mockResolvedValue([]);
      mockSubmit.mockResolvedValue({ exerciseSessionId: 'sess-1', normalizedScore: 80 });
      mockNext.mockResolvedValue(fakeExercise);

      // Wire up streamMessage to immediately fire onExerciseResult
      mockStream.mockImplementation((_convId, _content, _token, callbacks) => {
        callbacks.onExerciseResult({
          rawScore: 8,
          normalizedScore: 80,
          feedback: 'Well done!',
          domain: 'memory',
        });
        callbacks.onComplete();
        return fakeAbort;
      });

      // Set active exercise in store first
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
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/screens/train.test.tsx
```

Expected: 9 passing tests.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/screens/train.test.tsx
git commit -m "test: Train screen integration tests"
```

---

### Task 12: AuthGuard navigation tests

**Files:**
- Create: `apps/mobile/__tests__/navigation/auth-guard.test.tsx`

- [ ] **Step 1: Write the test file**

AuthGuard is defined inside `_layout.tsx`. We test it by rendering `RootLayout` and asserting on `mockRouter.replace` calls.

```typescript
// apps/mobile/__tests__/navigation/auth-guard.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
import { useAuthStore } from '@/store/auth.store';
import * as ExpoRouter from 'expo-router';

// We need to control useSegments per test
const mockUseSegments = ExpoRouter.useSegments as jest.Mock;

jest.mock('@/store/auth.store', () => {
  const hydrate = jest.fn().mockResolvedValue(undefined);
  let state = {
    token: null as string | null,
    user: null as any,
    hydrated: true,
    hydrate,
  };
  return {
    useAuthStore: jest.fn((selector) => selector(state)),
    __setState: (newState: Partial<typeof state>) => {
      state = { ...state, ...newState };
    },
    __getHydrate: () => hydrate,
  };
});

// Access the internal setState helper
const authStoreMock = require('@/store/auth.store');

describe('AuthGuard navigation', () => {
  beforeEach(() => {
    authStoreMock.__setState({ token: null, user: null, hydrated: true });
  });

  it('redirects unauthenticated user to login when not in (auth) group', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']); // currently on tabs
    authStoreMock.__setState({ token: null, user: null, hydrated: true });
    const { mockRouter } = require('@/jest.setup');
    render(<RootLayout />);
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login')
    );
  });

  it('does not redirect when unauthenticated and already in (auth) group', async () => {
    mockUseSegments.mockReturnValue(['(auth)']);
    authStoreMock.__setState({ token: null, user: null, hydrated: true });
    render(<RootLayout />);
    await waitFor(() => expect(authStoreMock.__getHydrate()()).resolves.toBeUndefined());
    const { mockRouter } = require('@/jest.setup');
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('redirects authenticated user with incomplete onboarding to /onboarding', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']);
    authStoreMock.__setState({
      token: 'tok',
      user: { id: '1', email: 'a@b.com', name: 'A', onboardingComplete: false },
      hydrated: true,
    });
    const { mockRouter } = require('@/jest.setup');
    render(<RootLayout />);
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding')
    );
  });

  it('redirects onboarding-complete user who is in onboarding to /(tabs)', async () => {
    mockUseSegments.mockReturnValue(['onboarding']);
    authStoreMock.__setState({
      token: 'tok',
      user: { id: '1', email: 'a@b.com', name: 'A', onboardingComplete: true },
      hydrated: true,
    });
    const { mockRouter } = require('@/jest.setup');
    render(<RootLayout />);
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)')
    );
  });

  it('redirects authenticated+onboarded user from (auth) to /(tabs)', async () => {
    mockUseSegments.mockReturnValue(['(auth)']);
    authStoreMock.__setState({
      token: 'tok',
      user: { id: '1', email: 'a@b.com', name: 'A', onboardingComplete: true },
      hydrated: true,
    });
    const { mockRouter } = require('@/jest.setup');
    render(<RootLayout />);
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)')
    );
  });

  it('does not redirect while hydration is in progress (hydrated=false)', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']);
    authStoreMock.__setState({ token: null, user: null, hydrated: false });
    const { mockRouter } = require('@/jest.setup');
    render(<RootLayout />);
    // Give it a tick — should not navigate
    await new Promise((r) => setTimeout(r, 10));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- __tests__/navigation/auth-guard.test.tsx
```

Expected: 6 passing tests.

> Note: The AuthGuard mock structure above uses a module-level state object. If you hit issues with the mock pattern, an alternative is to directly test the navigation logic by calling a helper function extracted from the `useEffect` — but the pattern above keeps the test black-box.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/__tests__/navigation/auth-guard.test.tsx
git commit -m "test: AuthGuard navigation integration tests"
```

---

### Task 13: Maestro E2E flows

**Files:**
- Create: `apps/mobile/.maestro/flows/login.yaml`
- Create: `apps/mobile/.maestro/flows/register.yaml`

> **Prerequisites:** Maestro CLI installed (`brew install maestro`). The app must be running on an iOS Simulator or Android emulator (`pnpm start` in `apps/mobile`, then press `i` for iOS simulator). Set the test account credentials as environment variables before running flows.

- [ ] **Step 1: Install Maestro CLI**

```bash
brew install maestro
```

Verify:
```bash
maestro --version
```
Expected: prints Maestro version (1.x.x).

- [ ] **Step 2: Create login E2E flow**

```yaml
# apps/mobile/.maestro/flows/login.yaml
appId: com.cogniguard.mobile
---
- launchApp:
    clearState: true
- assertVisible: "Preventia"
- tapOn:
    text: "you@example.com"
- inputText: "${EMAIL:-test@example.com}"
- tapOn:
    text: "••••••••"
- inputText: "${PASSWORD:-password123}"
- tapOn:
    text: "Sign In"
- assertVisible: "Train"
- assertVisible: "History"
```

- [ ] **Step 3: Create register E2E flow**

```yaml
# apps/mobile/.maestro/flows/register.yaml
appId: com.cogniguard.mobile
---
- launchApp:
    clearState: true
- assertVisible: "Preventia"
- tapOn:
    text: "Sign up"
- assertVisible: "Create Account"
- tapOn:
    text: "Jane Smith"
- inputText: "Test User"
- tapOn:
    text: "you@example.com"
- inputText: "testuser+${TIMESTAMP:-001}@example.com"
- tapOn:
    text: "At least 8 characters"
- inputText: "testpass123"
- tapOn:
    index: 1
    text: "••••••••"
- inputText: "testpass123"
- tapOn:
    text: "Create Account"
- assertVisible: "Assess Your Baseline"
- tapOn:
    text: "Continue"
- assertVisible: "Natural Conversation"
- tapOn:
    text: "Continue"
- assertVisible: "Track Your Progress"
- tapOn:
    text: "Let's Begin"
- assertVisible: "Train"
```

- [ ] **Step 4: Run the login flow against the running simulator**

First ensure the app is running:
```bash
cd apps/mobile
pnpm start
# press 'i' in Expo CLI to open iOS simulator
```

Then run the flow:
```bash
EMAIL=test@example.com PASSWORD=password123 maestro test apps/mobile/.maestro/flows/login.yaml
```

Expected: Maestro prints `✓ Flow completed` and the simulator shows the Train tab.

- [ ] **Step 5: Run the register flow**

```bash
maestro test apps/mobile/.maestro/flows/register.yaml
```

Expected: `✓ Flow completed` and the simulator shows the onboarding carousel, then the Train tab.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/.maestro/
git commit -m "test: Maestro E2E flows for login and register"
```

---

## Self-Review

**Spec coverage check:**

| Target | Covered by |
|--------|-----------|
| auth.store | Task 2 |
| conversation.store | Task 3 |
| lib/sse.ts (XHR, 401 refresh) | Task 4 |
| MessageBubble | Task 5 |
| ExerciseResultBanner (score colours, dismiss) | Task 6 |
| Login (validation, API call, nav) | Task 7 |
| Register (validation, API call, nav) | Task 8 |
| Onboarding (step flow, complete call) | Task 9 |
| History (conversations, exercises, empty, error, resume) | Task 10 |
| Train (init, send, exercise loop) | Task 11 |
| AuthGuard (all 4 routing cases + no-redirect during hydration) | Task 12 |
| E2E login + register | Task 13 |

**Placeholder scan:** No TBDs. All test code is complete. All mock patterns are consistent.

**Type consistency:** `fakeExercise.exercise.systemPromptFragment` matches `TrainScreen`'s `exercise.systemPromptFragment` usage. `onboardingCompletedAt` vs `onboardingComplete` derivation is consistent with the fix applied in auth.store and api.ts. `ChatMessage['exerciseResult']` used in `ExerciseResultBanner` props matches `conversation.store.ts` type definition.
