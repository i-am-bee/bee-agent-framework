import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { useEffect, useState } from 'react';

export function useCreateMCPClient(config: { serverUrl: string }) {
  const [client, setClient] = useState<MCPClient | null>(null);

  useEffect(() => {
    let closed = false;

    const transport = new SSEClientTransport(new URL(config.serverUrl));
    const mcpClient = new MCPClient(
      {
        name: 'example-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      },
    );

    const connectClient = async () => {
      try {
        await mcpClient.connect(transport);

        if (closed) {
          console.log('Transport has been closed.');

          return;
        }

        setClient(mcpClient);
      } catch (error) {
        console.error('Error connecting client:', error);
      }
    };

    connectClient();

    return () => {
      closed = true;

      transport.close();
    };
  }, [config.serverUrl]);

  return client;
}
