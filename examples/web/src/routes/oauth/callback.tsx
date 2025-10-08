'use client';

import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { onMcpAuthorization } from '@openchatkit/chat';

const OAuthCallback = () => {
  const calledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    
    let aborted = false;
    
    void onMcpAuthorization()
      .catch((err) => {
        if (!aborted) {
          console.error('OAuth callback failed', err);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!aborted && typeof window !== 'undefined' && window.opener) {
          try { window.close(); } catch {}
        }
      });
      
    return () => {
      aborted = true;
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-2">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-500">Authentication Error</h1>
            <p className="text-muted-foreground p-4 bg-red-50 border border-red-200 rounded">
              {error}
            </p>
            <p className="text-sm text-muted-foreground">
              You can close this window manually.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Authenticating...</h1>
            <p className="text-muted-foreground">This window should close automatically after authentication completes.</p>
          </>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute('/oauth/callback')({
  component: OAuthCallback,
});