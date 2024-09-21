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
  ToolError,
  BaseToolOptions,
  BaseToolRunOptions,
  JSONToolOutput,
} from "@/tools/base.js";
import { z } from "zod";
import { Sequelize } from "sequelize";
import { getMetadata } from "@/tools/database/metadata.js";
import { connectSql } from "@/tools/database/connection.js";
import { Cache } from "@/cache/decoratorCache.js";

type Provider = "mysql" | "mariadb" | "postgres" | "mssql" | "db2" | "sqlite" | "oracle";

type ToolOptions = { provider: Provider } & BaseToolOptions;
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

  private _sequelize: Sequelize | null = null;

  @Cache()
  protected async connection(): Promise<Sequelize> {
    this._sequelize = await connectSql();
    return this._sequelize;
  }

  protected async _run(
    { query }: ToolInput<this>,
    _options?: ToolRunOptions,
  ): Promise<JSONToolOutput<any>> {

    if (!this.isReadOnlyQuery(query)) {
      return new JSONToolOutput({
        success: false,
        error: "Invalid query. Only SELECT queries are allowed.",
      });
    }

    let metadata = "";
    const provider = this.options.provider;
    const sequelize = await this.connection();

    try {

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

      throw new ToolError(errorMessage);
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

  public async destroy(): Promise<void> {
    if (this._sequelize) {
      try {
        await this._sequelize.close();
        this._sequelize = null;
      } catch (error: any) {
        throw new ToolError(`Failed to close the database connection: ${error.message}`);
      }
    }
  }
}
