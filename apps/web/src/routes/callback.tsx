'use client';

import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { Loader } from '@/components/ai-elements/loader';
import { Button } from '@/components/ui/button';

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError('Authentication failed: ' + errorParam);
      setStatus('error');
      return;
    }

    if (!code) {
      setError('No authorization code received');
      setStatus('error');
      return;
    }

    const verifier = sessionStorage.getItem('openrouter-verifier');
    if (!verifier) {
      setError('Authorization session expired');
      setStatus('error');
      return;
    }

    const exchangeKey = async () => {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            code_verifier: verifier,
            code_challenge_method: 'S256',
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Exchange failed');
        }

        const { key } = await response.json();
        localStorage.setItem('openrouter-api-key', key);
        sessionStorage.removeItem('openrouter-verifier');
        setStatus('success');
      } catch (err: any) {
        setError(err.message || 'Failed to exchange code for key');
        setStatus('error');
      }
    };

    exchangeKey();
  }, [location, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (status === 'success') {
    setTimeout(() => navigate({ to: '/' }), 1500);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-2xl font-bold mb-4">Success!</h1>
        <p>Connected to OpenRouter. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="text-red-500 mb-4 max-w-md">{error}</p>
      <Button onClick={() => navigate({ to: '/' })}>
        Go Home
      </Button>
    </div>
  );
};

export const Route = createFileRoute('/callback')({
	component: Callback,
});
