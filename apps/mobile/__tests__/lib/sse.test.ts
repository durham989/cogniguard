// apps/mobile/__tests__/lib/sse.test.ts
import { streamMessage } from '@/lib/sse';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/store/auth.store', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

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

function sseChunk(eventType: string, data: Record<string, unknown>): string {
  return `event: ${eventType}\ndata: ${JSON.stringify({ type: eventType, ...data })}\n\n`;
}

let fakeXhr: FakeXHR;

beforeEach(() => {
  fakeXhr = makeFakeXHR();
  (global as any).XMLHttpRequest = jest.fn(() => fakeXhr);

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
  it('opens XHR POST to the correct conversation URL', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hello', 'tok-abc', cb);
    expect(fakeXhr.open).toHaveBeenCalledWith(
      'POST',
      expect.stringContaining('/conversations/conv-1/messages'),
    );
  });

  it('sets Authorization header with bearer token', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hello', 'tok-abc', cb);
    expect(fakeXhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer tok-abc');
  });

  it('sends JSON body with content', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hello', 'tok-abc', cb);
    expect(fakeXhr.send).toHaveBeenCalledWith(JSON.stringify({ content: 'hello' }));
  });

  it('appends exercise query params when exercise context is provided', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb, {
      sessionId: 'sess-1',
      domain: 'memory',
      fragment: 'Remember: apple, orange',
    });
    const url: string = (fakeXhr.open as jest.Mock).mock.calls[0][1];
    expect(url).toContain('exerciseSessionId=sess-1');
    expect(url).toContain('domain=memory');
  });

  it('calls onDelta for message.delta events', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sseChunk('message.delta', { delta: 'Hello' });
    fakeXhr.onprogress!();
    expect(cb.onDelta).toHaveBeenCalledWith('Hello');
  });

  it('calls onComplete for message.complete event', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sseChunk('message.complete', { message: { id: 'm1', content: 'Hi!' } });
    fakeXhr.onprogress!();
    expect(cb.onComplete).toHaveBeenCalled();
  });

  it('calls onExerciseResult with correct fields for exercise.result event', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sseChunk('exercise.result', {
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

  it('calls onError for error events from the server', () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sseChunk('error', { message: 'Something went wrong' });
    fakeXhr.onprogress!();
    expect(cb.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Something went wrong' }),
    );
  });

  it('flushes remaining buffer and finalizes on onload', async () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sseChunk('message.delta', { delta: 'last chunk' });
    fakeXhr.status = 200;
    await fakeXhr.onload!();
    expect(cb.onDelta).toHaveBeenCalledWith('last chunk');
    expect(cb.onComplete).toHaveBeenCalled();
  });

  it('calls onError for non-401 HTTP errors on onload', async () => {
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

  it('does not call onComplete twice if message.complete fires then onload fires', async () => {
    const cb = makeCallbacks();
    streamMessage('conv-1', 'hi', 'tok', cb);

    fakeXhr.responseText = sseChunk('message.complete', { message: {} });
    fakeXhr.onprogress!();
    fakeXhr.status = 200;
    await fakeXhr.onload!();
    expect(cb.onComplete).toHaveBeenCalledTimes(1);
  });

  describe('401 token refresh', () => {
    it('retries with new token when 401 on first attempt', async () => {
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

    it('calls clearAuth and onError when refresh request fails', async () => {
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
      expect(cb.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Session expired' }),
      );
    });

    it('does not retry on 401 when already a retry (isRetry=true)', async () => {
      const mockClearAuth = jest.fn().mockResolvedValue(undefined);
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        refreshToken: 'ref-token',
        updateTokens: jest.fn().mockResolvedValue(undefined),
        clearAuth: mockClearAuth,
      });

      // Refresh succeeds...
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
      });

      // But the SECOND XHR (retry) also gets a 401
      const secondFakeXhr = makeFakeXHR();
      secondFakeXhr.status = 401;
      let callCount = 0;
      (global as any).XMLHttpRequest = jest.fn(() => {
        callCount++;
        return callCount === 1 ? fakeXhr : secondFakeXhr;
      });

      const cb = makeCallbacks();
      streamMessage('conv-1', 'hi', 'tok', cb);

      fakeXhr.status = 401;
      await fakeXhr.onload!();

      // Now trigger the retry XHR's onload
      await secondFakeXhr.onload!();

      // Should NOT call fetch again (no second refresh attempt)
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
      // When isRetry=true and status=401, the code falls through to the normal error path
      // (HTTP 401 >= 400), so onError is called with HTTP 401 — NOT a second refresh
      expect(cb.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'HTTP 401' }));
    });
  });
});
