import { eq, asc, desc, ne, and } from 'drizzle-orm';
import type { DB } from '../db/index';
import { conversations, messages } from '../db/schema';
import type { ClaudeClient, StreamCallbacks } from './claude.service';
import { extractExerciseScore } from './exercise-embed.service';
import type { SSEEvent, Message } from '@cogniguard/types';

export interface ConversationServiceDeps {
  db: DB;
  claude: ClaudeClient;
}

export function createConversationService(deps: ConversationServiceDeps) {
  const { db, claude } = deps;

  async function createConversation(userId: string) {
    const [conversation] = await db.insert(conversations).values({ userId }).returning();
    return {
      id: conversation.id,
      userId: conversation.userId,
      state: conversation.state,
      startedAt: conversation.startedAt.toISOString(),
      endedAt: null as string | null,
    };
  }

  async function getLatestConversation(userId: string) {
    const conversation = await db.query.conversations.findFirst({
      where: and(eq(conversations.userId, userId), ne(conversations.state, 'SESSION_END')),
      orderBy: [desc(conversations.startedAt)],
    });
    if (!conversation) return null;
    return {
      id: conversation.id,
      userId: conversation.userId,
      state: conversation.state,
      startedAt: conversation.startedAt.toISOString(),
      endedAt: conversation.endedAt?.toISOString() ?? null,
    };
  }

  async function getMessages(conversationId: string, requestingUserId: string) {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    if (!conversation) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    if (conversation.userId !== requestingUserId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return msgs.map(toMessageDto);
  }

  /**
   * Streams an AI response for a user message.
   * Calls onEvent for each SSE event. Caller is responsible for writing to the response stream.
   */
  async function streamReply(
    conversationId: string,
    requestingUserId: string,
    userContent: string,
    exerciseSessionId: string | undefined,
    exerciseDomain: string | undefined,
    exerciseFragment: string | undefined,
    onEvent: (event: SSEEvent) => void,
  ): Promise<void> {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    if (!conversation) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    if (conversation.userId !== requestingUserId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });

    // Persist user message
    await db.insert(messages).values({
      conversationId,
      role: 'user',
      content: userContent,
    });

    // Fetch full message history for context
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    const claudeMessages = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const systemAppend = exerciseFragment
      ? `\n\n--- ACTIVE EXERCISE ---\n${exerciseFragment}\n--- END EXERCISE ---`
      : '';

    await claude.stream(claudeMessages, systemAppend, {
      onDelta(delta) {
        onEvent({ type: 'message.delta', delta });
      },
      async onComplete(fullText, _inputTokens, outputTokens) {
        const scoreResult = extractExerciseScore(fullText);
        const contentToStore = scoreResult ? scoreResult.cleanText : fullText;

        const [assistantMsg] = await db.insert(messages).values({
          conversationId,
          role: 'assistant',
          content: contentToStore,
          tokens: outputTokens,
          metadata: scoreResult
            ? { exerciseScore: { rawScore: scoreResult.rawScore, normalizedScore: scoreResult.normalizedScore } }
            : null,
        }).returning();

        if (scoreResult && exerciseSessionId && exerciseDomain) {
          onEvent({
            type: 'exercise.result',
            exerciseId: exerciseSessionId,
            domain: exerciseDomain as any,
            rawScore: scoreResult.rawScore,
            normalizedScore: scoreResult.normalizedScore,
            feedback: scoreResult.feedback,
          });
        }

        onEvent({
          type: 'message.complete',
          message: toMessageDto(assistantMsg),
        });
      },
      onError(error) {
        onEvent({ type: 'error', message: error.message });
      },
    });
  }

  return { createConversation, getLatestConversation, getMessages, streamReply };
}

function toMessageDto(m: typeof messages.$inferSelect): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    tokens: m.tokens,
    createdAt: m.createdAt.toISOString(),
  };
}
