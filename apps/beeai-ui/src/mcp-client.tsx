import React, { useEffect, useState } from "react";
import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export const MCPClientProvider = React.createContext<
  | undefined
  | {
      client: MCPClient;
    }
>(undefined);

export const useCreateMCPClient = (config: { serverUrl: string }) => {
  const [connectedClient, setConnectedClient] = useState<null | MCPClient>(
    null
  );

  useEffect(() => {
    let closed = false;

    const transport = new SSEClientTransport(new URL(config.serverUrl));
    const client = new MCPClient(
      {
        name: "example-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );

    client.connect(transport).then(() => {
      if (closed) {
        console.log("Transport has been closed");
        return;
      }

      setConnectedClient(client);
    });

    return () => {
      closed = true;
      transport.close();
    };
  }, []);

  return { client: connectedClient, setClient: setConnectedClient };
};

export const useMCPClient = () => {
  const context = React.useContext(MCPClientProvider);
  if (context === undefined) {
    throw new Error("MCPClient is not connected");
  }

  return context.client;
};
