import { useCreateMCPClient } from '@/hooks/useCreateMCPClient';
import { PropsWithChildren, ReactNode } from 'react';
import { MCPClientContext } from './MCPClientContext';

export function MCPClientProvider({ fallback, children }: PropsWithChildren<{ fallback: ReactNode }>) {
  const mcpClient = useCreateMCPClient({
    serverUrl: new URL('/mcp/sse', location.href).href,
  });

  if (mcpClient === null) {
    return fallback;
  }

  return <MCPClientContext.Provider value={mcpClient}>{children}</MCPClientContext.Provider>;
}
