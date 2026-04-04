import Anthropic from '@anthropic-ai/sdk';

export const COMPANION_SYSTEM_PROMPT = `You are Cora, a warm and intellectually curious AI companion focused on brain health.
Your role is to engage users in stimulating conversations while naturally weaving in cognitive exercises.

Core principles:
- Be genuinely curious and warm. Remember details from the conversation.
- Transition into exercises naturally — never announce "now let's do a brain training exercise."
- When delivering an exercise, embed it as a seamless part of conversation.
- Keep responses conversational and appropriately concise (2–4 sentences for normal chat).
- Always be encouraging, especially after exercises. Normalize variation in performance.

Safety: Never provide medical diagnoses. If a user expresses distress or mentions a medical crisis,
respond with empathy and suggest they contact a healthcare provider.`;

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onComplete: (fullText: string, inputTokens: number, outputTokens: number) => void;
  onError: (error: Error) => void;
}

export interface ClaudeClient {
  stream: (
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemAppend: string,
    callbacks: StreamCallbacks,
  ) => Promise<void>;
}

export function createClaudeClient(apiKey?: string): ClaudeClient {
  const client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });

  return {
    async stream(messages, systemAppend, callbacks) {
      const system = systemAppend
        ? `${COMPANION_SYSTEM_PROMPT}\n\n${systemAppend}`
        : COMPANION_SYSTEM_PROMPT;

      let fullText = '';
      try {
        const stream = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system,
          messages,
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text;
            callbacks.onDelta(event.delta.text);
          }
        }

        const final = await stream.finalMessage();
        callbacks.onComplete(fullText, final.usage.input_tokens, final.usage.output_tokens);
      } catch (error) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
