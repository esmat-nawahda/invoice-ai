import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!apiKey.trim()) {
        throw new Error('Please enter your API key');
      }

      if (!apiKey.startsWith('sk_')) {
        throw new Error('Invalid API key format. API keys should start with "sk_"');
      }

      // Simple validation - in a real app, you'd validate with the server
      login(apiKey.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid API key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-primary-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="6" height="8" rx="1" fill="white" opacity="0.9"/>
              <rect x="12" y="6" width="5" height="7" rx="1" fill="white" opacity="0.7"/>
              <circle cx="6" cy="8" r="0.5" fill="#1E40AF"/>
              <circle cx="8" cy="7" r="0.5" fill="#1E40AF"/>
              <circle cx="7" cy="10" r="0.5" fill="#1E40AF"/>
              <circle cx="14" cy="9" r="0.5" fill="#1E40AF"/>
              <circle cx="15" cy="8" r="0.5" fill="#1E40AF"/>
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Invoice AI
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your API key to access your business dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="api-key" className="sr-only">
              API Key
            </label>
            <div className="relative">
              <input
                id="api-key"
                name="api-key"
                type={showApiKey ? 'text' : 'password'}
                autoComplete="off"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm pr-10"
                placeholder="Enter your API key (sk_...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Need an API key?</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Contact your system administrator or{' '}
                <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                  create a new business account
                </a>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}