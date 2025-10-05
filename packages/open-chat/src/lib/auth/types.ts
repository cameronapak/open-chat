import type { OAuthMetadata } from '@modelcontextprotocol/sdk/shared/auth.js'
import type { AuthState } from './server-helpers.js'

export interface StoredState {
  expiry: number
  metadata?: OAuthMetadata // Optional: might not be needed if auth() rediscovers
  serverUrlHash: string
  // Add provider options needed on callback:
  providerOptions: {
    serverUrl: string
    storageKeyPrefix: string
    clientName: string
    clientUri: string
    callbackUrl: string
    scopes?: string[]
  }
}

export interface OpenRouterOAuthStatus {
  connected: boolean
  message?: string
}

export interface OpenRouterOAuthStatusResult {
  ok: boolean
  status?: OpenRouterOAuthStatus
  statusCode?: number
  statusText?: string
  message?: string
  error?: string
  payload?: unknown
}

export interface OpenRouterOAuthStartResult {
  ok: boolean
  authUrl?: string
  message?: string
  error?: string
  statusCode?: number
  statusText?: string
  payload?: unknown
}

export interface OpenRouterOAuthClientOptions {
  statusPath?: string
  startPath?: string
  fetchImpl?: typeof fetch
}

export interface OpenRouterOAuthClient {
  baseUrl: string
  statusUrl: string
  startUrl: string
  getStatus: () => Promise<OpenRouterOAuthStatusResult>
  startAuth: () => Promise<OpenRouterOAuthStartResult>
}

export interface UseOpenRouterAuthOptions extends OpenRouterOAuthClientOptions {
  baseUrl?: string
  defaultAuthMessage?: string
  pollingIntervalMs?: number
  autoStart?: boolean
}

export interface UseOpenRouterAuthReturn {
  authState: AuthState
  status?: OpenRouterOAuthStatus
  error?: string
  isChecking: boolean
  isStarting: boolean
  baseUrl: string
  statusUrl: string
  startUrl: string
  refreshStatus: () => Promise<OpenRouterOAuthStatusResult>
  startAuth: () => Promise<OpenRouterOAuthStartResult>
}

export type { PreparedAuthInjection } from './server-helpers.js'
export type { AuthState }