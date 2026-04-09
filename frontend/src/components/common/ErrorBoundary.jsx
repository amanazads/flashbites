import React from 'react';

// Track whether we've already attempted a reload to avoid infinite reload loops
const RELOAD_KEY = 'chunk_load_error_reload';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Detect stale JS chunk errors — these happen after a new Vercel deployment
    // when the browser has cached the old HTML that references old chunk filenames.
    const isChunkLoadError =
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.name === 'ChunkLoadError';

    if (isChunkLoadError) {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        console.warn('🔄 Stale chunk detected — reloading to fetch fresh assets...');
        window.location.reload();
      } else {
        // Already tried a reload — clear flag so next navigation can retry
        sessionStorage.removeItem(RELOAD_KEY);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
      const rawError = this.state.error;
      const errorMessage = rawError?.message || String(rawError || 'Unknown runtime error');
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center px-6">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Something went wrong</h1>
            <p className="text-gray-500 mb-2">This might be caused by a recent update.</p>
            <p className="text-sm text-gray-400 mb-8">A page reload usually fixes it.</p>
            {isDev && (
              <div className="mb-6 max-w-xl rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left text-xs text-red-700">
                <p className="font-semibold mb-1">Runtime error (dev only):</p>
                <p className="break-words">{errorMessage}</p>
              </div>
            )}
            <button
              onClick={() => {
                sessionStorage.removeItem(RELOAD_KEY);
                window.location.reload();
              }}
              className="btn-primary px-8 py-3 text-base"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;