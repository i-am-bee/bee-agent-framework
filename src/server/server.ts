import { OllamaChatLLM } from "@/adapters/ollama/chat.js";
import { BeeAgent } from "@/agents/bee/agent.js";
import { StreamlitAgent } from "@/agents/experimental/streamlit/agent.js";
import { UnconstrainedMemory } from "@/memory/unconstrainedMemory.js";
import { Version } from "@/version.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function createServer() {
  const server = new McpServer(
    {
      name: "Bee Agent Framework",
      version: Version,
    },
    {
      capabilities: {
        agents: {},
      },
    },
  );

  const bee = new BeeAgent({
    llm: new OllamaChatLLM(),
    tools: [],
    memory: new UnconstrainedMemory(),
  });
  server.agent(bee.meta.name, bee.meta.description, async (prompt) => {
    const output = await bee.run({ prompt });
    return {
      text: output.result.text,
    };
  });

  const streamlit = new StreamlitAgent({
    llm: new OllamaChatLLM(),
    memory: new UnconstrainedMemory(),
  });
  server.agent(streamlit.meta.name, streamlit.meta.description, async (prompt) => {
    const output = await streamlit.run({ prompt });
    return {
      text: output.result.raw,
    };
  });

  return server;
}

export async function runServer() {
  const server = await createServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

await runServer();
