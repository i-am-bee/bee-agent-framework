/**
 * Copyright 2024 IBM Corp.
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

import {
  Tool,
  ToolInput,
  BaseToolOptions,
  BaseToolRunOptions,
  JSONToolOutput,
} from "@/tools/base.js";
import { z } from "zod";
import { getMetadata } from "@/tools/database/metadata.js";
import { isSupported, connectSql } from "@/tools/database/connection.js";

type ToolOptions = { provider: string } & BaseToolOptions;
type ToolRunOptions = BaseToolRunOptions;

export class SQLTool extends Tool<JSONToolOutput<any>, ToolOptions, ToolRunOptions> {
  name = "SQLTool";

  description =
    "Converts natural language to SQL query and executes it using the provided tables schema.";

  inputSchema() {
    return z.object({
      query: z.string({ description: "The SQL query to be executed." }).min(1),
    });
  }

  static {
    this.register();
  }

  protected async _run(
    { query }: ToolInput<this>,
    _options?: ToolRunOptions,
  ): Promise<JSONToolOutput<any>> {
    const provider = this.options.provider;

    if (!isSupported(provider)) {
      throw new Error(`Unsupported database provider: ${provider}`);
    }

    if (!this.isReadOnlyQuery(query)) {
      return new JSONToolOutput({
        success: false,
        error: "Invalid query. Only SELECT queries are allowed.",
      });
    }

    let sequelize = null;
    let metadata = "";

    try {
      sequelize = await connectSql();
      metadata = await getMetadata(provider, sequelize);

      const [results] = await sequelize.query(query);

      if (Array.isArray(results) && results.length > 0) {
        return new JSONToolOutput({ success: true, results });
      } else {
        return new JSONToolOutput({
          success: false,
          message: `No rows selected`,
        });
      }
    } catch (error) {
      const errorMessage = `Based on this database schema structure: ${metadata}, 
      generate a correct query that retrieves data using the appropriate ${provider} dialect. 
      The original request was: ${query}, and the error was: ${error.message}.`;

      return new JSONToolOutput({ error: errorMessage });
    } finally {
      await sequelize?.close();
    }
  }

  private isReadOnlyQuery(query: string): boolean {
    const normalizedQuery = query.trim().toUpperCase();
    return (
      normalizedQuery.startsWith("SELECT") ||
      normalizedQuery.startsWith("SHOW") ||
      normalizedQuery.startsWith("DESC")
    );
  }
}
