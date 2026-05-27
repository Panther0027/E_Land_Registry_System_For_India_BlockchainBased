import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './i18n';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#1B4332', color: '#fff', borderRadius: '12px' },
              success: { iconTheme: { primary: '#D4A017', secondary: '#fff' } },
              error: { style: { background: '#DC2626' } },
            }}
          />
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
