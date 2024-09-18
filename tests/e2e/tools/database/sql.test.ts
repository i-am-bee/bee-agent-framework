import { SQLTool } from "@/tools/database/sql.js";
import { beforeEach, expect } from "vitest";

describe("SQLTool", () => {
  let instance: SQLTool;

  beforeEach(() => {
    instance = new SQLTool({ provider: "sqlite" });
  });

  it("Returns an error for invalid query", async () => {
    const response = await instance.run({
      query: "DELETE FROM users",
    });

    expect(response.result.success).toBe(false);
    expect(response.result.error).toContain("Only SELECT queries are allowed");
  });

  it("Throws for unsupported provider", async () => {
    const tool = new SQLTool({ provider: "snowflake" });

    await tool.run({ query: "SELECT * FROM users" }).catch((error) => {
      const errorMessage = error.errors?.find((e: Error) =>
        e.message.includes("Unsupported database provider"),
      );

      expect(errorMessage).toBeDefined();
    });
  });
});
