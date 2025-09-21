import { Hono } from 'hono';
import { chatRouter } from './chat';
import { oauthRouter } from './oauth';
import { modelsRouter } from './models';

const appRouter = new Hono();

// OAuth PKCE flow endpoints under /api/oauth
appRouter.route('/oauth', oauthRouter);

// Chat proxy under /api/chat
appRouter.route('/chat', chatRouter);

// Models proxy under /api/models
appRouter.route('/models', modelsRouter);

export { appRouter };
