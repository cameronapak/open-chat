export interface AuthState {
  ready: boolean
  message?: string
}

export type PreparedAuthInjection = {
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

export interface FetchAuthStateOptions {
  statusPath?: string
}

export interface PrepareAuthRequestOptions {
  tokenPath?: string
}

export async function fetchAuthState(
  baseApiUrl: string,
  options: FetchAuthStateOptions = {},
): Promise<AuthState> {
  const { statusPath = '/api/oauth/status' } = options
  try {
    const response = await fetch(resolveEndpoint(baseApiUrl, statusPath), {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) {
      return { ready: false }
    }
    const data = await response.json().catch(() => ({} as Record<string, unknown>))
    const connected = (data as { connected?: boolean }).connected ?? false
    const message = (data as { message?: string }).message

    return {
      ready: Boolean(connected),
      ...(typeof message === 'string' ? { message } : {}),
    }
  } catch {
    return { ready: false }
  }
}

export function createPrepareAuthRequest(
  baseApiUrl: string,
  options: PrepareAuthRequestOptions = {},
) {
  const { tokenPath = '/api/oauth/token' } = options
  return async function prepareAuthRequest(): Promise<PreparedAuthInjection> {
    try {
      const response = await fetch(resolveEndpoint(baseApiUrl, tokenPath), {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        return {}
      }

      const data = await response.json().catch(() => ({} as Record<string, unknown>))
      const headers = (data as { headers?: Record<string, string> }).headers
      const body = (data as { body?: Record<string, unknown> }).body

      const result: PreparedAuthInjection = {}
      if (isRecordOfStrings(headers)) {
        result.headers = headers
      }
      if (isRecord(body)) {
        result.body = body
      }
      return result
    } catch {
      return {}
    }
  }
}

function resolveEndpoint(baseApiUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const trimmedBase = baseApiUrl.endsWith('/') ? baseApiUrl.slice(0, -1) : baseApiUrl
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${trimmedBase}${normalizedPath}`
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false
  return Object.values(value).every((item) => typeof item === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}