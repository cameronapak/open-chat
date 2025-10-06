'use client'
import { useEffect } from 'react';
import { ListToolsResultSchema, ListResourcesResultSchema, ListPromptsResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { BrowserOAuthClientProvider } from '@/lib/auth/browser-provider'
import { sanitizeUrl } from 'strict-url-sanitise'
import { useAtom } from 'jotai'
import { mcpServerDetailsAtom } from '@/lib/atoms'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type MCPDetails = {
  tools?: any[]
  resources?: any[]
  resourceTemplates?: any[]
  prompts?: any[]
  serverInfo?: { name?: string; version?: string }
}

async function fetchMcpDetails(url: string): Promise<MCPDetails> {
  // Minimal standalone connection flow modeled after useMcp internals.  
  const sanitized = sanitizeUrl(url)
  if (!/^https?:/i.test(sanitized) || sanitized === 'about:blank') {
    throw new Error('Invalid MCP server URL (must be http(s)).')
  }
  const targetUrl = new URL(sanitized)
  const authProvider = new BrowserOAuthClientProvider(sanitized, {
    storageKeyPrefix: 'mcp:auth',
    clientName: 'OpenChat',
    clientUri: typeof window !== 'undefined' ? window.location.origin : '',
    callbackUrl: typeof window !== 'undefined'
      ? new URL('/oauth/callback', window.location.origin).toString()
      : '/oauth/callback',
    preventAutoAuth: false,
  })

  const client = new Client({ name: 'openchat-client', version: '0.1.0' }, { capabilities: {} })

  // Prefer HTTP; fallback to SSE on connect errors (404/405/CORS)
  let transportKind: 'http' | 'sse' = 'http'
  let transport:
    | StreamableHTTPClientTransport
    | SSEClientTransport
  try {
    transport = new StreamableHTTPClientTransport(targetUrl, {
      authProvider,
      requestInit: {
        method: 'POST',
        headers: { Accept: 'application/json, text/event-stream' },
      },
    })
  } catch {
    transportKind = 'sse'
    transport = new SSEClientTransport(targetUrl, {
      authProvider,
      requestInit: { headers: { Accept: 'application/json, text/event-stream' } },
    })
  }

  // Wire messages
  transport.onmessage = (message: any) => {
    // Forward to client instance
    try {
      // @ts-ignore
      client.handleMessage?.(message)
    } catch {
      // ignore
    }
  }

  // Connect and gather metadata
  try {
    await client.connect(transport)

    const toolsResp = await client.request({ method: 'tools/list' }, ListToolsResultSchema).catch(() => ({ tools: [] }))
    const resourcesResp = await client.request({ method: 'resources/list' }, ListResourcesResultSchema).catch(() => ({ resources: [], resourceTemplates: [] }))
    const promptsResp = await client.request({ method: 'prompts/list' }, ListPromptsResultSchema).catch(() => ({ prompts: [] }))

    const details: MCPDetails = {
      tools: Array.isArray(toolsResp.tools) ? toolsResp.tools : [],
      resources: Array.isArray(resourcesResp.resources) ? resourcesResp.resources : [],
      resourceTemplates: Array.isArray(resourcesResp.resourceTemplates) ? resourcesResp.resourceTemplates : [],
      prompts: Array.isArray(promptsResp.prompts) ? promptsResp.prompts : [],
      serverInfo: (client as any).serverInfo ? (client as any).serverInfo : undefined,
    }

    try {
      await transport.close()
    } catch {
      // ignore
    }

    return details
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const isLikelyHttpIssue =
      transportKind === 'http' &&
      (msg.includes('404') ||
        msg.includes('405') ||
        msg === 'Failed to fetch' ||
        msg === 'NetworkError when attempting to fetch resource.' ||
        msg === 'Load failed')
    if (!isLikelyHttpIssue) throw e
    // HTTP failed in a way that suggests server/route/CORS → fallback to SSE
    try { await transport.close() } catch { }
    transportKind = 'sse'
    transport = new SSEClientTransport(targetUrl, {
      authProvider,
      requestInit: { headers: { Accept: 'application/json, text/event-stream' } },
    })
    transport.onmessage = (message) => {
      try {
        /* @ts-ignore */
        client.handleMessage?.(message)
      } catch {
        // ignore
      }
    }
    await client.connect(transport)

    const toolsResp = await client.request({ method: 'tools/list' }, ListToolsResultSchema).catch(() => ({ tools: [] }))
    const resourcesResp = await client.request({ method: 'resources/list' }, ListResourcesResultSchema).catch(() => ({ resources: [], resourceTemplates: [] }))
    const promptsResp = await client.request({ method: 'prompts/list' }, ListPromptsResultSchema).catch(() => ({ prompts: [] }))

    const details: MCPDetails = {
      tools: Array.isArray(toolsResp.tools) ? toolsResp.tools : [],
      resources: Array.isArray(resourcesResp.resources) ? resourcesResp.resources : [],
      resourceTemplates: Array.isArray(resourcesResp.resourceTemplates) ? resourcesResp.resourceTemplates : [],
      prompts: Array.isArray(promptsResp.prompts) ? promptsResp.prompts : [],
      serverInfo: (client as any).serverInfo ? (client as any).serverInfo : undefined,
    }

    try {
      await transport.close()
    } catch {
      // ignore
    }

    return details
  }
}

export default function MCPServerDetails({ url, serverId }: { url: string; serverId: string }) {
  const [, setMcpDetails] = useAtom(mcpServerDetailsAtom)
  const queryClient = useQueryClient()

  const queryKey = ['mcpDetails', serverId, url]

  const { data, isLoading, isError, error, refetch } = useQuery<MCPDetails, Error>({
    queryKey,
    queryFn: async () => {
      if (!url) throw new Error('No URL')
      return await fetchMcpDetails(url)
    },
    // short cache for demo; adjust staleTime as desired
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  // Persist to atom when data arrives
  useEffect(() => {
    if (data) {
      setMcpDetails((prev: Record<string, any>) => ({ ...prev, [serverId]: { ...data, lastSeen: new Date().toISOString() } }))
      // also prime the query cache (already in cache by useQuery)
      queryClient.setQueryData(queryKey, data)
    }
  }, [data, serverId, setMcpDetails, queryClient])

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading details…</p>
  }
  if (isError) {
    return (
      <div>
        <p className="text-destructive text-sm">Failed to load details: {error?.message || 'Unknown'}</p>
        <button className="text-xs text-primary underline" onClick={() => refetch()}>Retry</button>
      </div>
    )
  }

  const details = (data ?? {}) as MCPDetails

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium">Tools</h4>
        {Array.isArray(details.tools) && details.tools.length > 0 ? (
          <ul className="ml-3 mt-2 list-disc text-sm">
            {details.tools.map((t: any, i: number) => (
              <li key={`${t?.name || t?.id || i}`}>
                <span title={t?.description || ''}>{t?.name || t?.title || t?.id || String(t)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">None</p>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium">Prompts</h4>
        {Array.isArray(details.prompts) && details.prompts.length > 0 ? (
          <ul className="ml-3 mt-2 list-disc text-sm">
            {details.prompts.map((p: any, i: number) => (
              <li key={`${p?.name || i}`}>
                <span title={p?.description || ''}>{p?.name || p?.title || p?.id || String(p)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">None</p>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium">Resources</h4>
        {Array.isArray(details.resources) && details.resources.length > 0 ? (
          <ul className="ml-3 mt-2 list-disc text-sm">
            {details.resources.map((r: any, i: number) => (
              <li key={`${r?.uri || r?.id || i}`}>
                <span title={r?.description || ''}>{r?.uri || r?.name || r?.id || String(r)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">None</p>
        )}
      </div>
    </div>
  )
}