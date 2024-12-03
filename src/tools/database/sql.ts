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

import { Cache } from "@/cache/decoratorCache.js";
import { AnyToolSchemaLike } from "@/internals/helpers/schema.js";
import {
  BaseToolOptions,
  BaseToolRunOptions,
  JSONToolOutput,
  Tool,
  ToolError,
  ToolInput,
  ToolInputValidationError,
} from "@/tools/base.js";
import {
  Provider,
  PublicProvider,
  getMetadata,
  searchColumnValues,
} from "@/tools/database/metadata.js";
import { ValidationError } from "ajv";
import { Options, Sequelize } from "sequelize";
import { z } from "zod";
import { csvToSqlite, excelToSqlite } from "./utils.js";
import { vectorStore } from "./vectordb.js";

interface SQLExample {
  question: string;
  query: string;
}

interface ToolOptions extends BaseToolOptions {
  provider: PublicProvider;
  connection:
    | Options
    | {
        storage: string;
      };
  examples?: SQLExample[];
}

export const ColumnSchema = z.object({
  name: z.string(),
  table: z.string(),
  values: z.array(z.string()).optional(),
});

export type ColumnType = z.infer<typeof ColumnSchema>;

type ToolRunOptions = BaseToolRunOptions;

export const SQLToolAction = {
  GetMetadata: "GET_METADATA",
  Query: "QUERY",
  GetExamples: "GET_EXAMPLES",
  SearchValues: "SEARCH_VALUES",
} as const;

export class SQLTool extends Tool<JSONToolOutput<any>, ToolOptions, ToolRunOptions> {
  public options: ToolOptions;
  public initialized = false;

  name = "SQLTool";

  actionDescriptions = [
    `${SQLToolAction.GetMetadata} - get database tables structure (metadata) and example questions and SQL that you can use as a starting point. Optionally, using keywords to search for specific columns`,
    `${SQLToolAction.SearchValues} - get distinct values for a set of columns using keywords to search`,
    `${SQLToolAction.Query} - execute the generated SQL query`,
  ];

  get description() {
    return `Converts natural language to SQL query and executes it. IMPORTANT: strictly follow this order of actions:
    ${this.actionDescriptions.join("\n")}
    
    Make sure to always query metadata first to understand the database schema before generating a query. In the metadata output there might also be example questions and SQL that you can use as a starting point.`;
  }

  inputSchema() {
    return z.object({
      action: z
        .nativeEnum(SQLToolAction)
        .describe(`The action to perform. ${this.actionDescriptions.join("; ")}`),
      query: z
        .string()
        .optional()
        .describe(`The SQL query to be executed, required for ${SQLToolAction.Query} action`),
      columns: z
        .array(ColumnSchema)
        .min(1)
        .max(4)
        .optional()
        .describe(
          `The columns to get distinct values for, required for ${SQLToolAction.SearchValues} action`,
        ),

      question: z
        .string()
        .optional()
        .describe(`The user question. Required for metadata and examples actions`),

      keywords: z
        .array(z.string())
        .min(1)
        .max(4)
        .optional()
        .describe(
          `Keywords used to search for specific columns, for ${SQLToolAction.GetMetadata} and ${SQLToolAction.SearchValues} actions`,
        ),
    });
  }

  public constructor(options: ToolOptions) {
    super(options);
    this.options = options;
    if (!("dialect" in options.connection) && !("storage" in options.connection)) {
      throw new ValidationError([
        {
          message: "Either dialect or storage is required",
          propertyName: "connection.dialect",
        },
      ]);
    }
    if (
      !("schema" in options.connection) &&
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

  protected validateInput(
    schema: AnyToolSchemaLike,
    input: unknown,
  ): asserts input is ToolInput<this> {
    super.validateInput(schema, input);
    if (input.action === SQLToolAction.Query && !input.query) {
      throw new ToolInputValidationError(
        `SQL Query is required for ${SQLToolAction.Query} action.`,
      );
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
    input: ToolInput<this>,
    _options: ToolRunOptions | undefined,
  ): Promise<JSONToolOutput<any>> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (input.action === SQLToolAction.GetMetadata) {
      const sequelize = await this.connection();
      let metadata = await getMetadata(
        sequelize,
        this.options.provider as Provider,
        "schema" in this.options.connection ? this.options.connection.schema : undefined,
      );

      // if examples also include them in the output
      if (this.options.examples) {
        const examples = await this.getExamples(
          (input.question as string) || input.keywords?.join(" ") || "",
        );
        metadata += `\n\nExample Questions and SQL that you can use as a starting point:\n ${examples
          .map((e) => `Question: ${e.question}\nSQL: ${e.sql}`)
          .join("\n\n")}`;
      }

      return new JSONToolOutput(metadata);
    }

    if (input.action === SQLToolAction.GetExamples) {
      const examples = await this.getExamples(input.question as string);
      return new JSONToolOutput({ success: true, results: examples });
    }

    if (input.action === SQLToolAction.SearchValues) {
      if (!input.columns?.length || !input.keywords?.length) {
        throw new ToolInputValidationError(
          "Columns or keywords are required for search values action",
        );
      }

      const sequelize = await this.connection();
      const results = await searchColumnValues(sequelize, input.columns!, input.keywords!, 20);
      return new JSONToolOutput({ success: true, results });
    }

    if (input.action === SQLToolAction.Query) {
      return await this.executeQuery(
        input.query!,
        this.options.provider as Provider,
        "schema" in this.options.connection ? this.options.connection.schema : undefined,
      );
    }

    throw new ToolError(`Invalid action specified: ${input.action}`);
  }

  protected async getExamples(question: string): Promise<{ question: string; sql: string }[]> {
    const similaritySearchResults = await vectorStore.similaritySearch(
      question,
      2,
      (d) => d.metadata.type == "sql",
    );

    return similaritySearchResults.map((e) => ({
      question: e.pageContent,
      sql: e.metadata.query,
    }));
  }

  protected async executeQuery(
    query: string,
    provider: Provider,
    schema: string | undefined,
  ): Promise<JSONToolOutput<any>> {
    if (!this.isReadOnlyQuery(query)) {
      return new JSONToolOutput({
        success: false,
        error: "Invalid query. Only SELECT queries are allowed.",
      });
    }

    try {
      const sequelize = await this.connection();
      const [results] = await sequelize.query(query);
      if (Array.isArray(results) && results.length > 0) {
        return new JSONToolOutput({ success: true, results });
      }

      return new JSONToolOutput({
        success: false,
        message: `No rows selected`,
      });
    } catch (error) {
      const schemaHint = schema
        ? `Fully qualify the table names by appending the schema name "${schema}" as a prefix, for example: ${schema}.table_name`
        : "";
      const errorMessage = `Generate a correct query that retrieves data using the appropriate ${provider} dialect.
      ${schemaHint}
      The original request was: ${query}, and the error was: ${error.message}.`;
      throw new ToolError(errorMessage);
    }
  }

  private isReadOnlyQuery(query: string): boolean {
    const normalizedQuery = query.trim().toUpperCase();
    return !["UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "INSERT", "TRUNCATE"].some((keyword) =>
      normalizedQuery.includes(keyword),
    );
  }

  private async initialize() {
    if (this.initialized) {
      return;
    }

    // Convert Excel to SQLite if provider is excel
    if (this.options.provider === "excel") {
      try {
        const sqlitePath = await excelToSqlite(this.options.connection.storage as string);
        // Update connection options to use the SQLite database
        this.options.provider = "sqlite";
        this.options.connection = {
          ...this.options.connection,
          dialect: "sqlite",
          storage: sqlitePath,
        };
      } catch (error) {
        throw new ToolError(`Failed to convert Excel to SQLite: ${error.message}`, [], {
          isRetryable: false,
          isFatal: true,
        });
      }
    }

    if (this.options.provider === "csv") {
      try {
        const sqlitePath = await csvToSqlite(this.options.connection.storage as string);
        this.options.provider = "sqlite";
        this.options.connection = {
          ...this.options.connection,
          dialect: "sqlite",
          storage: sqlitePath,
        };
      } catch (error) {
        throw new ToolError(`Failed to convert CSV to SQLite: ${error.message}`, [], {
          isRetryable: false,
          isFatal: true,
        });
      }
    }

    // Handle examples initialization
    if (this.options?.examples?.length) {
      const documents = this.options.examples.map((example) => ({
        pageContent: example.question,
        metadata: { type: "sql", query: example.query },
      }));
      await vectorStore.addDocuments(documents);
    }

    this.initialized = true;
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
