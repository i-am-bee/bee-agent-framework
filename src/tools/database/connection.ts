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

import { Sequelize, Dialect } from "sequelize";
import { ToolError } from "@/tools/base.js";

let dbSchema: string | undefined = undefined;

export async function connectSql(): Promise<Sequelize> {
  try {
    const dbName = process.env.DB_NAME as string;
    const dbUser = process.env.DB_USERNAME as string;
    const dbPassword = process.env.DB_PASSWORD;
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
    const dbDialect = process.env.DB_DIALECT as Dialect;
    const dbStorage = process.env.DB_STORAGE;

    dbSchema = process.env.DB_SCHEMA;

    const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
      host: dbHost,
      dialect: dbDialect,
      port: dbPort,
      schema: dbSchema,
      storage: dbStorage,
      logging: false,
    });

    await sequelize.authenticate();
    return sequelize;
  } catch (error) {
    throw new ToolError("Unable to connect to the SQL database:", [new Error(error)], {
      isRetryable: false,
    });
  }
}

export function getSchema(): string | undefined {
  return dbSchema || undefined;
}
