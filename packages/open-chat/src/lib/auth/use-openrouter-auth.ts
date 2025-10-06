import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  OpenRouterOAuthClient,
  UseOpenRouterAuthOptions,
  UseOpenRouterAuthReturn,
  OpenRouterOAuthStatus,
} from './types.js'
import { createOpenRouterOAuthClient, normalizeOpenRouterBaseUrl } from './create-openrouter-oauth-client.js'
import type { OpenRouterOAuthStatusResult } from './types.js'

const AUTH_DEFAULT_MESSAGE = 'Sign in to OpenRouter to start chatting.'

export function useOpenRouterAuth(options: UseOpenRouterAuthOptions = {}): UseOpenRouterAuthReturn {
  const {
    baseUrl,
    defaultAuthMessage = AUTH_DEFAULT_MESSAGE,
    pollingIntervalMs,
    autoStart = true,
    ...clientOptions
  } = options

  const normalizedBase = useMemo(() => normalizeOpenRouterBaseUrl(baseUrl), [baseUrl])
  const clientRef = useRef<OpenRouterOAuthClient | null>(null)

  if (!clientRef.current) {
    clientRef.current = createOpenRouterOAuthClient(normalizedBase, clientOptions)
  }

  const client = clientRef.current
  const [status, setStatus] = useState<OpenRouterOAuthStatus | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [isChecking, setIsChecking] = useState<boolean>(false)
  const [isStarting, setIsStarting] = useState<boolean>(false)
  const [authState, setAuthState] = useState<{ ready: boolean; message?: string }>({
    ready: false,
    message: defaultAuthMessage,
  })

  const applyStatusResult = useCallback(
    (result: OpenRouterOAuthStatusResult) => {
      if (result.ok && result.status) {
        setStatus(result.status)
        setAuthState({
          ready: Boolean(result.status.connected),
          message: result.status.connected ? undefined : result.status.message ?? defaultAuthMessage,
        })
        setError(undefined)
      } else {
        const nextMessage = result.message ?? defaultAuthMessage
        setStatus(undefined)
        setAuthState({ ready: false, message: nextMessage })
        setError(result.error ?? result.message)
      }
    },
    [defaultAuthMessage],
  )

  const refreshStatus = useCallback(async (): Promise<OpenRouterOAuthStatusResult> => {
    if (!client) {
      const fallback = {
        ok: false,
        message: 'OAuth client unavailable.',
      } as OpenRouterOAuthStatusResult
      applyStatusResult(fallback)
      return fallback
    }

    setIsChecking(true)
    try {
      const result = await client.getStatus()
      applyStatusResult(result)
      return result
    } finally {
      setIsChecking(false)
    }
  }, [client, applyStatusResult])

  const startAuth = useCallback(async () => {
    if (!client) {
      const message = 'OAuth client unavailable.'
      setError(message)
      setAuthState({ ready: false, message })
      return {
        ok: false,
        message,
        error: message,
      }
    }

    setIsStarting(true)
    try {
      const result = await client.startAuth()
      if (result.ok) {
        const authUrl = result.authUrl
        if (authUrl && typeof window !== 'undefined') {
          window.location.href = authUrl
        } else if (result.message) {
          setAuthState((prev) => ({
            ready: prev.ready,
            message: result.message,
          }))
        }
      } else {
        const message = result.message ?? defaultAuthMessage
        setAuthState({ ready: false, message })
        setError(result.error ?? message)
      }
      return result
    } finally {
      setIsStarting(false)
    }
  }, [client, defaultAuthMessage])

  useEffect(() => {
    let intervalId: number | undefined

    if (autoStart) {
      void refreshStatus()
    }

    if (pollingIntervalMs && pollingIntervalMs > 0) {
      intervalId = window.setInterval(() => {
        void refreshStatus()
      }, pollingIntervalMs)
    }

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
      }
    }
  }, [autoStart, pollingIntervalMs, refreshStatus])

  return {
    authState,
    status,
    error,
    isChecking,
    isStarting,
    baseUrl: client.baseUrl,
    statusUrl: client.statusUrl,
    startUrl: client.startUrl,
    refreshStatus,
    startAuth,
  }
}