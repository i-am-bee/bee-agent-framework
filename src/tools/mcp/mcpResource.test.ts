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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { MCPResourceTool } from "./mcpResource.js";
import { entries } from "remeda";

const resources = {
  "file:///animals.txt": {
    name: "Info about animals",
    mimeType: "text/plain",
    text: "Lion, shark, bizon",
  },
  "file:///planets.txt": {
    name: "Info about planets",
    mimeType: "text/plain",
    text: "Earth, Mars, Venus",
  },
} as const;

describe("MCPResourceTool", () => {
  const server = new Server(
    {
      name: "test-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
      },
    },
  );

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  let instance: MCPResourceTool;

  beforeAll(async () => {
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: entries(resources).map(([uri, { name }]) => ({ uri, name })),
      };
    });
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resource = resources[request.params.uri as keyof typeof resources];
      if (!resource) {
        throw new Error("Resource not found");
      }
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      };
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  beforeEach(() => {
    instance = new MCPResourceTool({ client });
  });

  describe("MCPTool", () => {
    it("Runs", async () => {
      const uri = "file:///planets.txt";
      const response = await instance.run({ uri });
      expect(response.result.contents[0].text).toBe(resources[uri].text);
    });
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });
});
