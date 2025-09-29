'use client';

import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { onMcpAuthorization } from '@/lib/auth/calback';

const OAuthCallback = () => {
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    void onMcpAuthorization()
      .catch((err) => {
        console.error('OAuth callback failed', err);
      })
      .finally(() => {
        if (typeof window !== 'undefined' && window.opener) {
          try { window.close(); } catch {}
        }
      });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Authenticating...</h1>
        <p className="text-muted-foreground">This window should close automatically after authentication completes.</p>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/oauth/callback')({
  component: OAuthCallback,
});