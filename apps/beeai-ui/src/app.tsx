import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ErrorFallback } from './components/fallbacks/ErrorFallback';
import { MCPFallback } from './components/fallbacks/MCPFallback';
import { AppLayout } from './components/layouts/AppLayout';
import { MCPClientProvider } from './contexts/MCPClient/MCPClientProvider';
import { Home } from './pages/Home';

const queryClient = new QueryClient();

export function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <MCPClientProvider fallback={<MCPFallback />}>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Home />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </MCPClientProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
