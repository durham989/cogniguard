import { API } from './api';

export interface SSECallbacks {
  onDelta: (text: string) => void;
  onComplete: () => void;
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
 * Uses XMLHttpRequest — React Native's Hermes does not support response.body.getReader().
 */
export interface ExerciseContext {
  sessionId: string;
  domain: string;
  fragment: string;
}

export function streamMessage(
  conversationId: string,
  content: string,
  token: string,
  callbacks: SSECallbacks,
  exercise?: ExerciseContext,
): AbortController {
  const controller = new AbortController();
  const xhr = new XMLHttpRequest();
  let processedLength = 0;
  let buffer = '';
  let completed = false;

  function finalize() {
    if (completed) return;
    completed = true;
    callbacks.onComplete();
  }

  function parseLine(line: string) {
    if (!line.startsWith('data: ')) return;
    const data = line.slice(6).trim();
    if (!data || data === '[DONE]') return;

    let event: Record<string, any>;
    try {
      event = JSON.parse(data);
    } catch {
      return;
    }

    switch (event.type) {
      case 'message.delta':
        if (event.delta) callbacks.onDelta(event.delta);
        break;
      case 'message.complete':
        // Server sends: { type, message: { id, content, ... } }
        finalize();
        break;
      case 'exercise.result':
        // Server sends flat: { type, exerciseId, domain, rawScore, normalizedScore, feedback }
        callbacks.onExerciseResult({
          rawScore: event.rawScore,
          normalizedScore: event.normalizedScore,
          feedback: event.feedback ?? '',
          domain: event.domain,
        });
        break;
      case 'error':
        callbacks.onError(new Error(event.message ?? 'Stream error'));
        break;
    }
  }

  function processChunk(chunk: string) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) parseLine(line);
  }

  const params = new URLSearchParams();
  if (exercise) {
    params.set('exerciseSessionId', exercise.sessionId);
    params.set('domain', exercise.domain);
    params.set('exerciseFragment', encodeURIComponent(exercise.fragment));
  }
  const qs = exercise ? `?${params.toString()}` : '';

  xhr.open(
    'POST',
    `${API.conversation}/conversations/${conversationId}/messages${qs}`,
  );
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);

  xhr.onprogress = () => {
    const newChunk = xhr.responseText.slice(processedLength);
    processedLength = xhr.responseText.length;
    if (newChunk) processChunk(newChunk);
  };

  xhr.onload = () => {
    // Flush any remaining buffered data
    const remaining = xhr.responseText.slice(processedLength);
    if (remaining) processChunk(remaining);
    if (xhr.status >= 400) {
      callbacks.onError(new Error(`HTTP ${xhr.status}`));
    }
    // Always finalize — guards against missing message.complete event
    finalize();
  };

  xhr.onerror = () => {
    if (!controller.signal.aborted) {
      callbacks.onError(new Error('Network error'));
    }
    finalize();
  };

  controller.signal.addEventListener('abort', () => xhr.abort());

  xhr.send(JSON.stringify({ content }));

  return controller;
}
