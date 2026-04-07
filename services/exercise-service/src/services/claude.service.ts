import Anthropic from '@anthropic-ai/sdk';

export interface ScoringResult {
  rawScore: number;
  normalizedScore: number;
  feedback: string;
}

export interface ClaudeScorer {
  score: (rubric: string, userResponse: string) => Promise<ScoringResult>;
}

export function createClaudeScorer(apiKey?: string): ClaudeScorer {
  const client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });

  return {
    async score(rubric, userResponse) {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Score this cognitive exercise response.\n\nSCORING RUBRIC:\n${rubric}\n\nUSER RESPONSE:\n${userResponse}\n\nOutput ONLY this JSON on its own line:\nEXERCISE_SCORE: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<1 encouraging sentence>"}`,
        }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const match = text.match(/EXERCISE_SCORE:\s*(\{[\s\S]*?\})/);
      if (!match) throw new Error('Claude did not return a valid score');

      let parsed: ScoringResult;
      try {
        parsed = JSON.parse(match[1]) as ScoringResult;
      } catch {
        throw new Error('Claude returned malformed score JSON');
      }
      return {
        rawScore: parsed.rawScore,
        normalizedScore: parsed.normalizedScore,
        feedback: parsed.feedback,
      };
    },
  };
}
