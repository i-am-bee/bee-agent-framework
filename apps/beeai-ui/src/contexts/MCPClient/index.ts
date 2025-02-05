import { use } from 'react';
import { MCPClientContext } from './MCPClientContext';

export function useMCPClient() {
  const context = use(MCPClientContext);

  if (!context) {
    throw new Error('MCPClient is not connected.');
  }

  return context;
}
