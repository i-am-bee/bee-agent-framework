import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { createContext } from 'react';

export const MCPClientContext = createContext<MCPClient | null>(null);
