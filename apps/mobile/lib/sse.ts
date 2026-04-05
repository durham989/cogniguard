import { API } from './api';

export interface SSECallbacks {
  onDelta: (text: string) => void;
  onComplete: (fullText: string) => void;
  onExerciseResult: (result: {
    rawScore: number;
    normalizedScore: number;
    feedback: string;
    domain: string;
  }) => void;
  onError: (err: Error) => void;
}

/**
 * Streams a message to the conversation service via SSE.
 * Returns an AbortController so the caller can cancel mid-stream.
 */
export function streamMessage(
  conversationId: string,
  content: string,
  token: string,
  callbacks: SSECallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(
        `${API.conversation}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const event = JSON.parse(data) as {
              type: string;
              delta?: string;
              text?: string;
              result?: {
                rawScore: number;
                normalizedScore: number;
                feedback: string;
                domain: string;
              };
              error?: string;
            };

            if (event.type === 'message.delta' && event.delta) {
              callbacks.onDelta(event.delta);
            } else if (event.type === 'message.complete' && event.text) {
              callbacks.onComplete(event.text);
            } else if (event.type === 'exercise.result' && event.result) {
              callbacks.onExerciseResult(event.result);
            } else if (event.type === 'error') {
              callbacks.onError(new Error(event.error ?? 'Stream error'));
            }
          } catch {
            // Malformed JSON line — skip
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        callbacks.onError(err);
      }
    }
  })();

  return controller;
}
