import { QueryClient, QueryClientProvider } from "react-query";
import { MCPClientProvider, useCreateMCPClient } from "./mcp-client";
import { ToolsView } from "./tools-view";

const queryClient = new QueryClient();

function App() {
  const mcpClient = useCreateMCPClient({
    serverUrl: "http://localhost:5173/mcp/sse",
  });

  if (mcpClient.client === null) {
    return <div>Connecting to MCP...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MCPClientProvider.Provider value={{ client: mcpClient.client }}>
        <h1>Welcome to BeeAI!</h1>
        <ToolsView />
      </MCPClientProvider.Provider>
    </QueryClientProvider>
  );
}

export default App;
