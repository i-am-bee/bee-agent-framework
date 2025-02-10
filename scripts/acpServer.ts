#!/usr/bin/env npx -y tsx
/**
 * Copyright 2025 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { McpServer } from "@agentcommunicationprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@agentcommunicationprotocol/sdk/server/stdio.js";

import { StreamlitAgent } from "@/agents/experimental/streamlit/agent.js";
import { UnconstrainedMemory } from "@/memory/unconstrainedMemory.js";
import { z } from "zod";
import { Version } from "@/version.js";
import { OllamaChatModel } from "@/adapters/ollama/backend/chat.js";

async function registerAgents(server: McpServer) {
  const streamlitMeta = new StreamlitAgent({
    llm: new OllamaChatModel("llama3.1"),
    memory: new UnconstrainedMemory(),
  }).meta;
  server.agent(
    streamlitMeta.name,
    streamlitMeta.description,
    z.object({
      prompt: z.string(),
    }),
    z.object({
      code: z.string(),
    }),
    async ({
      params: {
        input: { prompt },
      },
    }) => {
      const output = await new StreamlitAgent({
        llm: new OllamaChatModel("llama3.1"),
        memory: new UnconstrainedMemory(),
      }).run({ prompt });
      return {
        code: output.result.raw,
      };
    },
  );
}

export async function runServer() {
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
  await registerAgents(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

await runServer();
