import { Hono } from 'hono';
import { chatRouter } from '@/routers/chat';
import { oauthRouter } from '@/routers/oauth';
import { modelsRouter } from '@/routers/models';

const appRouter = new Hono();

// OAuth PKCE flow endpoints under /api/oauth
appRouter.route('/oauth', oauthRouter);

// Chat proxy under /api/chat
appRouter.route('/chat', chatRouter);

// Models proxy under /api/models
appRouter.route('/models', modelsRouter);

export { appRouter };
