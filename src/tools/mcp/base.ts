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

import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";

import { Tool, JSONToolOutput } from "@/tools/base.js";

export interface MCPToolInput {
  client: MCPClient;
}

export class MCPToolOutput<T> extends JSONToolOutput<T> {}

export abstract class MCPTool<T> extends Tool<MCPToolOutput<T>> {
  public readonly client: MCPClient;

  constructor({ client, ...options }: MCPToolInput) {
    super(options);
    this.client = client;
  }

  protected async paginateUntilLimit<T>(
    fetcher: (
      params: { cursor?: string },
      options: { signal?: AbortSignal },
    ) => Promise<{ nextCursor?: string; items: T[] }>,
    limit: number,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    const items: T[] = [];
    let cursor: string | undefined = undefined;
    while (items.length < limit) {
      const result = await fetcher({ cursor }, { signal });
      items.push(...result.items);
      cursor = result.nextCursor;
      if (!cursor) {
        break;
      }
    }
    return items.slice(0, limit);
  }
}
