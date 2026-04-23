import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import type { ConversationServiceDeps } from '../services/conversation.service';
import { createConversationService } from '../services/conversation.service';
import type { SSEEvent } from '@cogniguard/types';

export function createConversationsRouter(deps: ConversationServiceDeps) {
  const router = Router();
  const conversationService = createConversationService(deps);

  router.use(requireAuth);

  router.post('/', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    try {
      const conversation = await conversationService.createConversation(userId);
      return res.status(201).json(conversation);
    } catch (err) {
      console.error('Create conversation error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    const convs = await conversationService.listConversations(userId);
    return res.json(convs);
  });

  router.get('/latest', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    const conversation = await conversationService.getLatestConversation(userId);
    return res.json(conversation); // null if none
  });

  router.get('/:id/messages', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    try {
      const msgs = await conversationService.getMessages(req.params.id, userId);
      return res.json(msgs);
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Conversation not found' });
      if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  const sendMessageSchema = z.object({ content: z.string().min(1).max(8000) });

  router.post('/:id/messages', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid message content' });

    const exerciseSessionId = req.query.exerciseSessionId as string | undefined;
    const exerciseDomain = req.query.domain as string | undefined;
    const exerciseFragment = req.query.exerciseFragment
      ? decodeURIComponent(req.query.exerciseFragment as string)
      : undefined;
    const exerciseBridge = req.query.exerciseBridge
      ? decodeURIComponent(req.query.exerciseBridge as string)
      : undefined;

    // Set up SSE headers before streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    function send(event: SSEEvent) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    }

    try {
      await conversationService.streamReply(
        req.params.id,
        userId,
        parsed.data.content,
        exerciseSessionId,
        exerciseDomain,
        exerciseFragment,
        exerciseBridge,
        send,
      );
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        // Headers already sent — send error event
        send({ type: 'error', message: 'Conversation not found' });
      } else if (err.code === 'FORBIDDEN') {
        send({ type: 'error', message: 'Forbidden' });
      } else {
        send({ type: 'error', message: 'Internal server error' });
      }
    }
    res.end();
  });

  return router;
}
