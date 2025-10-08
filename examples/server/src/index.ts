import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { appRouter } from './routers';

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type"],
		credentials: true,
	}),
);

app.route('/api', appRouter);

app.get("/", (c) => {
	return c.text("OK");
});

export default {
	// Railway assigns a random port to expose for each deployment, 
	// which can be accessed via the PORT environment variable.
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch
}

