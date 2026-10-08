'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: {
            theme: 'outline';
            size: 'large';
            text: 'continue_with';
            width: number;
          }) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('arjun.mehta@student.edu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const devLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';

  const signInWithGoogle = useCallback(async (credential: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.auth.googleLogin(credential);
      await login(result.access_token);
    } catch {
      setError('Google sign-in failed. Please try again or contact your campus administrator.');
      setLoading(false);
    }
  }, [login]);

  const initializeGoogleSignIn = useCallback(() => {
    if (!googleClientId || !googleButtonRef.current || !window.google?.accounts.id) return;
    googleButtonRef.current.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        void signInWithGoogle(response.credential);
      },
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: 320,
    });
  }, [googleClientId, signInWithGoogle]);

  useEffect(() => {
    initializeGoogleSignIn();
  }, [initializeGoogleSignIn]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.devLogin(email);
      await login(res.access_token);
    } catch {
      setError('Development sign-in failed. Check that development login is enabled on the backend.');
      setLoading(false);
    } finally {
      if (devLoginEnabled) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Campus Signal</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <div className="mt-8 space-y-6">
          {googleClientId ? (
            <>
              <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onLoad={initializeGoogleSignIn}
              />
              <div ref={googleButtonRef} className="flex min-h-10 justify-center" />
            </>
          ) : (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
              Google sign-in is not configured for this deployment.
            </p>
          )}

          {devLoginEnabled && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Or use development login</span>
                </div>
              </div>

              <form onSubmit={handleDevLogin} className="space-y-4">
                <div>
                  <select
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border bg-slate-50"
                  >
                    <option value="arjun.mehta@student.edu">Student (Arjun)</option>
                    <option value="admin@college.edu">Admin</option>
                    <option value="ravi.kumar@college.edu">Staff (Ravi - IT)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Dev Sign In'}
                </button>
              </form>
            </>
          )}

          {loading && !devLoginEnabled && (
            <p className="text-center text-sm text-slate-500" role="status">Signing in...</p>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
          )}
          {!devLoginEnabled && !googleClientId && (
            <p className="text-center text-sm text-slate-500">
              Authentication is unavailable until Google OAuth is configured.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
