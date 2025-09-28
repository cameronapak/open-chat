'use client';

import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { onMcpAuthorization } from '@/lib/auth/calback';

const OAuthCallback = () => {
  useEffect(() => {
    onMcpAuthorization();
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