import { parse } from "csv-parse";
import fs from "fs";
import path from "path";
import { DataTypes, Sequelize } from "sequelize";
import XLSX from "xlsx";

interface ConversionOptions {
  headerRows?: number; // Number of header rows (default: 1)
  skipRows?: number; // Number of rows to skip after headers
  dateFormat?: string; // Date format for parsing
  encoding?: string; // File encoding (for CSV)
  delimiter?: string; // CSV delimiter
}

/**
 * Converts an Excel file to SQLite database
 * @param filePath Path to the Excel file
 * @param options Parsing options
 * @returns Path to the created SQLite database
 */
export async function excelToSqlite(
  filePath: string,
  options: ConversionOptions = {},
): Promise<string> {
  const workbook = XLSX.readFile(filePath);

  // delete existing db file

  const dbPath = path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}.sqlite`,
  );

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: dbPath,
    logging: false,
  });

  try {
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        dateNF: options.dateFormat,
      }) as any[][];

      if (data.length === 0) {
        continue;
      }

      // Get headers and data
      const headerRow = options.headerRows || 1;
      const headers = data
        .slice(0, headerRow)
        .flat()
        .map(
          (h) =>
            h
              ?.toString()
              .replace(/[^a-zA-Z0-9]/g, "_")
              .toLowerCase() || "column",
        );
      const rows = data.slice(headerRow + (options.skipRows || 0));

      // Infer column types from data
      const columnTypes = headers.reduce(
        (acc, header, idx) => {
          const columnValues = rows.map((row) => row[idx]);
          acc[header] = inferColumnType(columnValues);
          return acc;
        },
        {} as Record<string, string>,
      );

      // Create table
      const tableName = sheetName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const model = sequelize.define(tableName, createAttributes(headers, columnTypes), {
        timestamps: false,
        freezeTableName: true,
      });

      await model.sync();

      // check model type
      // Insert data
      const formattedRows = rows.map((row) =>
        headers.reduce(
          (obj, header, idx) => {
            obj[header] = convertValueToType(row[idx], columnTypes[header]);
            return obj;
          },
          {} as Record<string, any>,
        ),
      );

      await model.bulkCreate(formattedRows);
    }

    await sequelize.close();
    return dbPath;
  } catch (error) {
    await sequelize.close();
    throw new Error(`Failed to convert Excel to SQLite: ${error.message}`);
  }
}

/**
 * Converts a CSV file to SQLite database
 * @param filePath Path to the CSV file
 * @param options Parsing options
 * @returns Path to the created SQLite database
 */
export async function csvToSqlite(
  filePath: string,
  options: ConversionOptions = {},
): Promise<string> {
  const dbPath = path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}.sqlite`,
  );

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: dbPath,
    logging: false,
  });

  return new Promise((resolve, reject) => {
    const rows: any[][] = [];
    fs.createReadStream(filePath, { encoding: "utf-8" })
      .pipe(
        parse({
          delimiter: options.delimiter || ",",
          skip_empty_lines: true,
        }),
      )
      .on("data", (row) => rows.push(row))
      .on("end", async () => {
        try {
          if (rows.length === 0) {
            throw new Error("CSV file is empty");
          }

          const headerRow = options.headerRows || 1;
          const headers = rows
            .slice(0, headerRow)
            .flat()
            .map(
              (h) =>
                h
                  ?.toString()
                  .replace(/[^a-zA-Z0-9]/g, "_")
                  .toLowerCase() || "column",
            );
          const data = rows.slice(headerRow + (options.skipRows || 0));

          // Infer column types
          const columnTypes = headers.reduce(
            (acc, header, idx) => {
              const columnValues = data.map((row) => row[idx]);
              acc[header] = inferColumnType(columnValues);
              return acc;
            },
            {} as Record<string, string>,
          );

          // Create table
          const tableName = path
            .basename(filePath, ".csv")
            .replace(/[^a-zA-Z0-9]/g, "_")
            .toLowerCase();

          const model = sequelize.define(tableName, createAttributes(headers, columnTypes), {
            timestamps: false,
            freezeTableName: true,
          });

          await model.sync();

          // Insert data
          const formattedRows = data.map((row) =>
            headers.reduce(
              (obj, header, idx) => {
                obj[header] = convertValueToType(row[idx], columnTypes[header]);
                return obj;
              },
              {} as Record<string, any>,
            ),
          );

          await model.bulkCreate(formattedRows);
          await sequelize.close();
          resolve(dbPath);
        } catch (error) {
          await sequelize.close();
          reject(new Error(`Failed to convert CSV to SQLite: ${error.message}`));
        }
      })
      .on("error", async (error) => {
        await sequelize.close();
        reject(new Error(`Failed to read CSV file: ${error.message}`));
      });
  });
}

export function inferColumnType(values: any[]): string {
  if (values.length === 0) {
    return "TEXT";
  }

  const nonNullValues = values.filter((v) => v != null && v !== "");
  if (nonNullValues.length === 0) {
    return "TEXT";
  }

  // Check value types
  const types = new Set(
    nonNullValues.map((value) => {
      if (value instanceof Date) {
        return "DATE";
      }
      if (typeof value === "boolean") {
        return "BOOLEAN";
      }
      // Check if the value is a number in string format
      if (typeof value === "string" && !isNaN(parseFloat(value))) {
        return "number";
      }
      return typeof value;
    }),
  );

  // If all values are of the same type, use that type
  if (types.size === 1) {
    const type = types.values().next().value;
    switch (type) {
      case "number": {
        // Check if all numbers are integers
        const allIntegers = nonNullValues.every((v) => Number.isInteger(parseFloat(v)));
        return allIntegers ? "INTEGER" : "REAL";
      }
      case "DATE":
        return "DATE";
      case "BOOLEAN":
        return "BOOLEAN";
      default:
        return "TEXT";
    }
  }

  // If mixed types, default to TEXT
  return "TEXT";
}

export function convertValueToType(value: any, type: string): any {
  if (value == null || value === "" || Number.isNaN(value)) {
    return null;
  }

  if (type === "INTEGER" || type === "REAL") {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return null;
      }
      return value;
    }
    let stringifiedValue = value.toString().trim();

    // Handle various number formats
    if (typeof value === "string") {
      // Detect format based on patterns
      const hasCommaDecimal = /\d,\d+$/.test(stringifiedValue); // European decimal
      const hasThousandsDot = /\d{1,3}(\.\d{3})+([,]\d+)?$/.test(stringifiedValue); // European thousands
      const hasThousandsApostrophe = /\d{1,3}('\d{3})+([.]\d+)?$/.test(stringifiedValue); // Swiss format
      const hasThousandsSpace = /\d{1,3}( \d{3})+([.,]\d+)?$/.test(stringifiedValue); // Space separator

      // Convert to standard format (1234.56)
      if (hasCommaDecimal && hasThousandsDot) {
        // European format (1.234,56)
        stringifiedValue = stringifiedValue.replace(/\./g, "").replace(",", ".");
      } else if (hasThousandsApostrophe) {
        // Swiss format (1'234.56)
        stringifiedValue = stringifiedValue.replace(/'/g, "");
      } else if (hasThousandsSpace) {
        // Space separator format (1 234.56)
        stringifiedValue = stringifiedValue.replace(/ /g, "");
      } else {
        // US/UK format (1,234.56)
        stringifiedValue = stringifiedValue.replace(/,/g, "");
      }
    }

    const parsed = parseFloat(stringifiedValue);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return type === "INTEGER" ? Math.round(parsed) : parsed;
  }

  if (type === "DATE") {
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Try to parse the date string
    const parsedDate = new Date(value);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    // If standard parsing fails, try manual parsing for specific formats
    const dateStr = value.toString().trim();

    // Handle DD/MM/YYYY format
    const ddmmyyyy = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [_, day, month, year] = ddmmyyyy;
      return new Date(`${year}-${month}-${day}`).toISOString();
    }

    // Handle DD.MM.YYYY format
    const ddmmyyyyDot = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (ddmmyyyyDot) {
      const [_, day, month, year] = ddmmyyyyDot;
      return new Date(`${year}-${month}-${day}`).toISOString();
    }

    // If all parsing attempts fail, return the original value
    return value;
  }

  if (type === "BOOLEAN") {
    if (typeof value === "boolean") {
      return value;
    }
    const strValue = value.toString().toLowerCase().trim();
    if (["true", "1", "yes", "y"].includes(strValue)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(strValue)) {
      return false;
    }
    return null;
  }

  return value.toString().trim();
}

// Helper function to create a safe name
function createSafeName(name?: string): string | undefined {
  return name?.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}

// Helper function to create attributes for Sequelize model
function createAttributes(
  headers: string[],
  columnTypes: Record<string, string>,
): Record<string, any> {
  const attributes: Record<string, any> = {};
  headers.forEach((header: string) => {
    if (!header) {
      return;
    }
    const safeHeader = createSafeName(header);
    const finalHeader = /^\d/.test(safeHeader!) ? `col_${safeHeader}` : safeHeader;

    const columnType = columnTypes[header] || "TEXT";
    const sequelizeType = mapColumnTypeToSequelize(columnType);

    if (finalHeader) {
      attributes[finalHeader] = {
        type: sequelizeType,
        allowNull: true,
      };
    }
  });
  return attributes;
}

// Helper function to map column types
function mapColumnTypeToSequelize(columnType: string) {
  switch (columnType) {
    case "INTEGER":
      return DataTypes.INTEGER;
    case "REAL":
      return DataTypes.FLOAT;
    case "DATE":
      return DataTypes.DATE;
    case "BOOLEAN":
      return DataTypes.BOOLEAN;
    default:
      return DataTypes.TEXT;
  }
}
