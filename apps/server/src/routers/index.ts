import { Hono } from 'hono';
import { chatRouter } from './chat';
import { oauthRouter } from './oauth';

const appRouter = new Hono();

// OAuth PKCE flow endpoints under /api/oauth
appRouter.route('/oauth', oauthRouter);

// Chat proxy under /api/chat
appRouter.route('/chat', chatRouter);

export { appRouter };
