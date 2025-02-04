import { useCreateMCPClient } from '@/hooks/useCreateMCPClient';
import { MCP_CLIENT_SERVER_URL } from '@/utils/constants';
import { PropsWithChildren, ReactNode } from 'react';
import { MCPClientContext } from './MCPClientContext';

export function MCPClientProvider({ fallback, children }: PropsWithChildren<{ fallback: ReactNode }>) {
  const mcpClient = useCreateMCPClient({
    serverUrl: MCP_CLIENT_SERVER_URL,
  });

  if (mcpClient === null) {
    return fallback;
  }

  return <MCPClientContext.Provider value={mcpClient}>{children}</MCPClientContext.Provider>;
}
