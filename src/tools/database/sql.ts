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
import { Sequelize, Options } from "sequelize";
import { Provider, getMetadata } from "@/tools/database/metadata.js";
import { Cache } from "@/cache/decoratorCache.js";
import { ValidationError } from "ajv";

interface ToolOptions extends BaseToolOptions {
  provider: Provider;
  connection: Options;
}
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

  public constructor(options: ToolOptions) {
    super(options);
    if (!options.connection.dialect) {
      throw new ValidationError([
        {
          message: "Property is required",
          propertyName: "connection.dialect",
        },
      ]);
    }
    if (
      !options.connection.schema &&
      (options.provider === "oracle" || options.provider === "db2")
    ) {
      throw new ValidationError([
        {
          message: `Property is required for ${options.provider}`,
          propertyName: "connection.schema",
        },
      ]);
    }
    if (!options.connection.storage && options.provider === "sqlite") {
      throw new ValidationError([
        {
          message: `Property is required for ${options.provider}`,
          propertyName: "connection.storage",
        },
      ]);
    }
  }

  static {
    this.register();
  }

  @Cache()
  protected async connection(): Promise<Sequelize> {
    try {
      const sequelize = new Sequelize(this.options.connection);

      await sequelize.authenticate();
      return sequelize;
    } catch (error) {
      throw new ToolError(`Unable to connect to database: ${error}`, [], {
        isRetryable: false,
        isFatal: true,
      });
    }
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
    const schema = this.options.connection.schema;

    try {
      metadata = await getMetadata(sequelize, provider, schema);

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
    // @ts-expect-error protected property
    const cache = Cache.getInstance(this, "connection");
    const entry = cache.get();

    if (entry) {
      cache.clear();

      try {
        await entry.data.close();
      } catch (error) {
        throw new ToolError(`Failed to close the database connection`, [error]);
      }
    }
  }
}
