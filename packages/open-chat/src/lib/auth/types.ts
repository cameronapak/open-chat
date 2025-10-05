import type { OAuthMetadata } from '@modelcontextprotocol/sdk/shared/auth.js'

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

export type { AuthState, PreparedAuthInjection } from './server-helpers.js'