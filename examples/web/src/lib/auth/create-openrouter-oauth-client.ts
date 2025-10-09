import type {
  OpenRouterOAuthClient,
  OpenRouterOAuthClientOptions,
  OpenRouterOAuthStartResult,
  OpenRouterOAuthStatus,
  OpenRouterOAuthStatusResult,
} from './types.js'

const DEFAULT_STATUS_PATH = '/api/oauth/status'
const DEFAULT_START_PATH = '/api/oauth/start'
const DEFAULT_AUTH_MESSAGE = 'Sign in to OpenRouter to start chatting.'

type JsonValue = Record<string, unknown> | undefined

export function normalizeOpenRouterBaseUrl(baseUrl?: string): string {
  if (!baseUrl) return ''
  const trimmed = baseUrl.trim()
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

export function resolveOpenRouterEndpoint(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (!baseUrl) return normalizedPath
  return `${baseUrl}${normalizedPath}`
}

export function createOpenRouterOAuthClient(
  baseUrl: string | undefined,
  options: OpenRouterOAuthClientOptions = {},
): OpenRouterOAuthClient {
  const normalizedBase = normalizeOpenRouterBaseUrl(baseUrl)
  const {
    statusPath = DEFAULT_STATUS_PATH,
    startPath = DEFAULT_START_PATH,
    fetchImpl = typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined,
  } = options

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for OpenRouter OAuth helpers.')
  }

  const statusUrl = resolveOpenRouterEndpoint(normalizedBase, statusPath)
  const startUrl = resolveOpenRouterEndpoint(normalizedBase, startPath)

  const getStatus = async (): Promise<OpenRouterOAuthStatusResult> => {
    try {
      const response = await fetchImpl(statusUrl, {
        method: 'GET',
        // credentials: 'include',
      })

      const payload = await readPayload(response)
      if (response.ok) {
        const status = extractStatus(payload)
        return {
          ok: true,
          status,
          statusCode: response.status,
          statusText: response.statusText,
          message: status?.message,
          payload,
        }
      }

      const message = extractMessage(payload) ?? DEFAULT_AUTH_MESSAGE
      return {
        ok: false,
        statusCode: response.status,
        statusText: response.statusText,
        message,
        error: extractError(payload),
        payload,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        ok: false,
        message,
        error: message,
      }
    }
  }

  const startAuth = async (): Promise<OpenRouterOAuthStartResult> => {
    try {
      const response = await fetchImpl(startUrl, {
        method: 'POST',
        credentials: 'include',
      })

      const payload = await readPayload(response)
      if (response.ok) {
        const authUrl = extractAuthUrl(payload)
        const message = extractMessage(payload)
        return {
          ok: true,
          authUrl,
          message,
          statusCode: response.status,
          statusText: response.statusText,
          payload,
        }
      }

      const message = extractMessage(payload) ?? DEFAULT_AUTH_MESSAGE
      return {
        ok: false,
        message,
        error: extractError(payload) ?? message,
        statusCode: response.status,
        statusText: response.statusText,
        payload,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        ok: false,
        message,
        error: message,
      }
    }
  }

  return {
    baseUrl: normalizedBase,
    statusUrl,
    startUrl,
    getStatus,
    startAuth,
  }
}

async function readPayload(response: Response): Promise<JsonValue> {
  const text = await response.text()
  if (!text) return undefined
  try {
    const json = JSON.parse(text)
    return isRecord(json) ? json : undefined
  } catch {
    return undefined
  }
}

function extractStatus(payload: JsonValue): OpenRouterOAuthStatus {
  const connectedValue = payload?.connected
  const messageValue = payload?.message
  return {
    connected: typeof connectedValue === 'boolean' ? connectedValue : Boolean(connectedValue),
    message: typeof messageValue === 'string' ? messageValue : undefined,
  }
}

function extractMessage(payload: JsonValue): string | undefined {
  if (!payload) return undefined
  if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message
  }
  if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
    return payload.error
  }
  return undefined
}

function extractError(payload: JsonValue): string | undefined {
  if (!payload) return undefined
  if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
    return payload.error
  }
  return undefined
}

function extractAuthUrl(payload: JsonValue): string | undefined {
  if (!payload) return undefined
  const authUrl = payload.authUrl
  if (typeof authUrl === 'string' && authUrl.length > 0) {
    return authUrl
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}