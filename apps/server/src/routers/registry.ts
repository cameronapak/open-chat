import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { MCPRegistryClient } from 'mcp-registry-spec-sdk';

const registryApp = new Hono();
const mcpRegistry = new MCPRegistryClient();

// Health check endpoint
registryApp.get('/health', async (c) => {
  try {
    const health = await mcpRegistry.health.getHealth();
    // Add caching headers for serverless deployment
    c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=30'); // 1 minute cache
    return c.json(health);
  } catch (error) {
    console.error('Registry health check failed:', error);
    return c.json({ error: 'Failed to check registry health' }, 500);
  }
});

// Ping endpoint
registryApp.get('/ping', async (c) => {
  try {
    const ping = await mcpRegistry.ping.ping();
    // Add caching headers for serverless deployment
    c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=30'); // 1 minute cache
    return c.json(ping);
  } catch (error) {
    console.error('Registry ping failed:', error);
    return c.json({ error: 'Failed to ping registry' }, 500);
  }
});

// List servers endpoint with query validation
registryApp.get('/servers', zValidator('query', z.object({
  cursor: z.string().optional(),
  limit: z.string().transform((val) => parseInt(val)).optional(),
  search: z.string().optional(),
  updated_since: z.string().optional(),
  version: z.string().optional(),
})), async (c) => {
  try {
    const query = c.req.valid('query');
    const options: any = {};

    if (query.cursor) options.cursor = query.cursor;
    if (query.limit) options.limit = query.limit;
    if (query.search) options.search = query.search;
    if (query.updated_since) options.updated_since = query.updated_since;
    if (query.version) options.version = query.version;

    console.log('Fetching servers with options:', options);
    const response = await mcpRegistry.server.listServers(options);

    // Filter to only remote servers as the frontend expects
    const remoteServers = response.servers.filter(server =>
      server.remotes && server.remotes.length > 0
      && server.remotes.find(r => r.transportType === "streamable-http" || r.transportType === "http+sse")
    )

    // Add caching headers for serverless deployment
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60'); // 5 minutes cache

    return c.json({
      ...response,
      servers: remoteServers
    });
  } catch (error) {
    console.error('Registry servers fetch failed:', error);
    return c.json({ error: 'Failed to fetch servers from registry' }, 500);
  }
});

// Get individual server endpoint
registryApp.get('/servers/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const server = await mcpRegistry.server.getServerByName(id);

    // Add caching headers for serverless deployment
    c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=300'); // 1 hour cache

    return c.json(server);
  } catch (error) {
    console.error(`Registry get server ${c.req.param('id')} failed:`, error);
    return c.json({ error: 'Failed to get server from registry' }, 500);
  }
});

// Export the app and its type for RPC
export default registryApp;
export type RegistryAppType = typeof registryApp;
