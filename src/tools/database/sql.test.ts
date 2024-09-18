import { beforeEach, expect, vi } from "vitest";
import { SQLTool } from "@/tools/database/sql.js";
import { connectSql, isSupported } from "@/tools/database/connection.js";
import { getMetadata } from "@/tools/database/metadata.js";
import { Sequelize } from "sequelize";

vi.mock("@/tools/database/connection.js", () => ({
  connectSql: vi.fn(),
  isSupported: vi.fn(),
}));

vi.mock("@/tools/database/metadata.js", () => ({
  getMetadata: vi.fn(),
}));

describe("SQLTool", () => {
  const mockSequelize = {
    query: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Is a valid tool", () => {
    const tool = new SQLTool({ provider: "mysql" });
    expect(tool).instanceOf(SQLTool);
    expect(SQLTool.isTool(tool)).toBe(true);
    expect(tool.name).toBeDefined();
    expect(tool.description).toBeDefined();
  });

  it("Executes a valid SELECT query", async () => {
    vi.mocked(isSupported).mockReturnValue(true);

    vi.mocked(connectSql).mockResolvedValue(mockSequelize as unknown as Sequelize);
    vi.mocked(getMetadata).mockResolvedValue("Table schema");

    mockSequelize.query.mockResolvedValueOnce([[{ id: 1, name: "John Doe" }]]);

    const tool = new SQLTool({ provider: "mysql" });

    const result = await tool.run({
      query: "SELECT * FROM users;",
    });

    expect(result.result.success).toBe(true);
    expect(result.result.results).toEqual([{ id: 1, name: "John Doe" }]);
    expect(mockSequelize.query).toHaveBeenCalledWith("SELECT * FROM users;");
  });

  it("Handles non-SELECT queries", async () => {
    const tool = new SQLTool({ provider: "mysql" });

    const result = await tool.run({
      query: "DELETE FROM users;",
    });

    expect(result.result.success).toBe(false);
    expect(result.result.error).toBe("Invalid query. Only SELECT queries are allowed.");
  });

  it("Handles provider errors", async () => {
    vi.mocked(isSupported).mockReturnValue(false);

    const tool = new SQLTool({ provider: "snowflake" });

    await tool.run({ query: "SELECT * FROM users;" }).catch((error) => {
      const errorMessage = error.errors?.find((e: Error) =>
        e.message.includes("Unsupported database provider"),
      );

      expect(errorMessage).toBeDefined();
    });
  });

  it("Returns top-n query results", async () => {
    vi.mocked(isSupported).mockReturnValue(true);

    vi.mocked(connectSql).mockResolvedValue(mockSequelize as unknown as Sequelize);

    mockSequelize.query.mockResolvedValueOnce([
      [
        { id: 1, name: "John Doe" },
        { id: 2, name: "Jane Doe" },
      ],
    ]);

    const tool = new SQLTool({ provider: "mysql" });

    const result = await tool.run({
      query: "SELECT * FROM users;",
    });

    expect(result.result.results.length).toBe(2);
  });
});
