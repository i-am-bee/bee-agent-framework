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

import { ToolEmitter, ToolInput } from "@/tools/base.js";
import { z } from "zod";
import { Emitter } from "@/emitter/emitter.js";
import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { MCPTool, MCPToolInput, MCPToolOutput } from "./base.js";

export interface MCPResourceToolInput extends MCPToolInput {
  resourceLimit?: number;
}

export class MCPResourceTool extends MCPTool<ReadResourceResult> {
  name = "MCP Resource";
  description = `An MCP Resource tool provides ability to read resources. Use it to read contents of available resources.`;

  public readonly emitter: ToolEmitter<ToolInput<this>, MCPToolOutput<ReadResourceResult>> =
    Emitter.root.child({
      namespace: ["tool", "mcp", "resource"],
      creator: this,
    });

  public readonly resourceLimit: number;

  constructor({ resourceLimit = Infinity, ...options }: MCPResourceToolInput) {
    super(options);
    this.resourceLimit = resourceLimit;
  }

  async inputSchema() {
    const resources = await this.listResources().catch(() => []); // ignore errors, e.g. MCP server might not have resource capability
    return z.object({
      uri: z
        .string()
        .describe(
          `URI of the resource to read, ${resources.length > 0 ? `available resources are:\n\n${resources.map(({ uri, name, description }) => JSON.stringify({ uri, name, description })).join("\n\n")}` : "no resources available at the moment"}.`,
        ),
    });
  }

  protected async _run({ uri }: ToolInput<this>, { signal }: { signal?: AbortSignal }) {
    const result = await this.client.readResource({ uri }, { signal });
    return new MCPToolOutput(result);
  }

  public async listResources({ signal }: { signal?: AbortSignal } = {}) {
    return await this.paginateUntilLimit(
      ({ cursor }, { signal }) =>
        this.client
          .listResources({ cursor }, { signal })
          .then(({ resources, nextCursor }) => ({ items: resources, nextCursor })),
      this.resourceLimit,
      { signal },
    );
  }
}
