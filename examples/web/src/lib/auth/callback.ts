// callback.ts
import { auth } from '@modelcontextprotocol/sdk/client/auth.js'
import { BrowserOAuthClientProvider } from './browser-provider' // Adjust path
import type { StoredState } from './types' // Adjust path, ensure definition includes providerOptions

/**
 * Handles the OAuth callback using the SDK's auth() function.
 * Assumes it's running on the page specified as the callbackUrl.
 */
export async function onMcpAuthorization() {
  const queryParams = new URLSearchParams(window.location.search)
  const code = queryParams.get('code')
  const state = queryParams.get('state')
  const error = queryParams.get('error')
  const errorDescription = queryParams.get('error_description')

  const logPrefix = '[mcp-callback]' // Generic prefix, or derive from stored state later

  let provider: BrowserOAuthClientProvider | null = null
  let storedStateData: StoredState | null = null
  let broadcastChannel: BroadcastChannel | null = null
  let stateKey: string | undefined

  const resolveState = (requestedState: string): { key: string; value: StoredState } => {
    const candidateKeys: string[] = []
    const defaultKey = `mcp:auth:state_${requestedState}`
    candidateKeys.push(defaultKey)

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key) continue
      if (key === defaultKey) continue
      if (!key.includes(`state_${requestedState}`)) continue
      candidateKeys.push(key)
    }

    for (const key of candidateKeys) {
      const rawValue = localStorage.getItem(key)
      if (!rawValue) continue
      try {
        const parsedValue = JSON.parse(rawValue) as StoredState
        return { key, value: parsedValue }
      } catch (parseError) {
        console.warn(`${logPrefix} Failed to parse stored state at key "${key}":`, parseError)
      }
    }

    throw new Error(`Invalid or expired state parameter "${requestedState}". No matching state found in storage.`)
  }

  try {
    // --- Basic Error Handling ---
    if (error) {
      throw new Error(`OAuth error: ${error} - ${errorDescription || 'No description provided.'}`)
    }
    if (!code) {
      throw new Error('Authorization code not found in callback query parameters.')
    }
    if (!state) {
      throw new Error('State parameter not found or invalid in callback query parameters.')
    }

    // --- Retrieve Stored State & Provider Options ---
    const resolvedState = resolveState(state)
    stateKey = resolvedState.key
    storedStateData = resolvedState.value

    // Ensure provider options are present
    if (!storedStateData.providerOptions) {
      throw new Error('Stored state is missing required provider options.')
    }
    const { serverUrl, storageKeyPrefix = 'mcp:auth', ...providerOptions } = storedStateData.providerOptions
    if (!serverUrl) {
      throw new Error('Stored state is missing required providerOptions.serverUrl.')
    }
    let parsedUrl: URL
    try {
      parsedUrl = new URL(serverUrl)
    } catch {
      throw new Error('Invalid providerOptions.serverUrl.')
    }
    // Ensure we have a BroadcastChannel for communication
    broadcastChannel = new BroadcastChannel(`mcp-auth-${parsedUrl.host}`)
    // Validate expiry
    if (!storedStateData.expiry || storedStateData.expiry < Date.now()) {
      localStorage.removeItem(stateKey)
      throw new Error('OAuth state has expired. Please try initiating authentication again.')
    }

    // --- Instantiate Provider ---
    provider = new BrowserOAuthClientProvider(serverUrl, {
      storageKeyPrefix,
      ...providerOptions,
    })

    // --- Call SDK Auth Function ---
    // The SDK auth() function will internally:
    // 1. Use provider.clientInformation()
    // 2. Use provider.codeVerifier()
    // 3. Call exchangeAuthorization()
    // 4. Use provider.saveTokens() on success
    const authResult = await auth(provider, { serverUrl, authorizationCode: code })

    if (authResult === 'AUTHORIZED') {
      // --- Notify Opener and Close (Success) ---
      broadcastChannel.postMessage({ type: 'mcp_auth_callback', success: true })
      window.close()
      // Clean up state ONLY on success and after notifying opener
      if (stateKey) {
        localStorage.removeItem(stateKey)
      }
    } else {
      // This case shouldn't happen if `authorizationCode` is provided to `auth()`
      throw new Error(`Unexpected result from authentication library: ${authResult}`)
    }
  } catch (err) {
    console.error(`${logPrefix} Error during OAuth callback handling:`, err)
    const errorMessage = err instanceof Error ? err.message : String(err)

    // --- Notify Opener and Display Error (Failure) ---
    broadcastChannel?.postMessage({ type: 'mcp_auth_callback', success: false, error: errorMessage })
    // Optionally close even on error, depending on UX preference
    // window.close();

    // Display error in the callback window
    // We'll throw the error instead of writing to document.body.innerHTML to avoid nuking the React tree
    // Clean up potentially invalid state on error
    if (stateKey) {
      localStorage.removeItem(stateKey)
    }
    // Clean up potentially dangling verifier or last_auth_url if auth failed badly
    // Note: saveTokens should clean these on success
    if (provider) {
      try {
        localStorage.removeItem(provider.getKey('code_verifier'))
        localStorage.removeItem(provider.getKey('last_auth_url'))
      } catch (storageError) {
        console.warn(`${logPrefix} Could not clean up storage items:`, storageError)
      }
    }
    
    throw new Error(errorMessage);
  }
}