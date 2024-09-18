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

import { Sequelize } from "sequelize";
import { getSchema } from "@/tools/database/connection.js";

export interface Metadata {
  tableName: string;
  columnName: string;
  dataType: string;
}

export async function getMetadata(provider: string, sequelize: Sequelize): Promise<string> {
  try {
    const query = getMetadataQuery(provider);

    const [metadata] = (await sequelize.query(query)) as [Metadata[], any];

    const tableMap = new Map<string, string[]>();

    metadata.forEach(({ tableName, columnName, dataType }) => {
      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, [`Table '${tableName}' with columns: ${columnName} (${dataType})`]);
      } else {
        tableMap.get(tableName)!.push(`${columnName} (${dataType})`);
      }
    });

    return Array.from(tableMap.values())
      .map((columns) => columns.join(", "))
      .join("; ");
  } catch (error) {
    throw new Error(`Error initializing metadata: ${error.message}`);
  }
}

function getMetadataQuery(provider: string): string {
  let schemaName = getSchema();

  switch (provider) {
    case "mysql":
    case "mariadb":
      return `
          SELECT t.table_name AS tableName, c.column_name AS columnName, 
                 c.data_type AS dataType
          FROM information_schema.tables t
          JOIN information_schema.columns c ON t.table_name = c.table_name
          WHERE t.table_schema = DATABASE();
        `;

    case "postgres":
      schemaName = schemaName ?? "public";

      return `
          SELECT t.table_name AS "tableName", c.column_name AS "columnName", 
                 c.data_type AS "dataType"
          FROM information_schema.tables t
          JOIN information_schema.columns c ON t.table_name = c.table_name
          WHERE t.table_schema = lower('${schemaName}');
        `;

    case "mssql":
      schemaName = schemaName ?? "dbo";

      return `
          SELECT t.name AS tableName, c.name AS columnName,
                 ty.name AS dataType
           FROM sys.tables t
           JOIN sys.columns c ON t.object_id = c.object_id
           JOIN sys.types ty ON c.user_type_id = ty.user_type_id
           JOIN sys.schemas s ON t.schema_id = s.schema_id
           WHERE t.is_ms_shipped = 0 AND t.type = 'U'
                AND s.name = lower('${schemaName}');
        `;

    case "db2":
      if (schemaName === undefined) {
        throw new Error(`Schema name is required for ${provider}`);
      }

      return `
          SELECT t.tabname AS "tableName", c.colname AS "columnName", 
                 c.typename AS "dataType"
          FROM SYSCAT.TABLES t
          JOIN SYSCAT.COLUMNS c ON t.tabname = c.tabname
          WHERE t.tabschema = upper('${schemaName}');
        `;

    case "sqlite":
      return `
          SELECT tbl_name AS "tableName", name AS "columnName", type AS "dataType"
            FROM (
                SELECT name AS tbl_name
                FROM sqlite_master
                WHERE type = 'table'
            )
            JOIN pragma_table_xinfo(tbl_name);
        `;

    case "oracle":
      if (schemaName === undefined) {
        throw new Error(`Schema name is required for ${provider}`);
      }
      return `
          SELECT t.table_name AS "tableName", c.column_name AS "columnName", 
                 c.data_type AS "dataType"
          FROM all_tables t
          JOIN all_tab_columns c ON t.table_name = c.table_name
          WHERE t.owner = upper('${schemaName}');
        `;

    default:
      throw new Error(`Unsupported database provider: ${provider}`);
  }
}