import { SQLTool } from "@/tools/database/sql.js";
import { beforeEach, expect } from "vitest";

describe("SQLTool", () => {
  let instance: SQLTool;

  beforeEach(() => {
    instance = new SQLTool({
      provider: "sqlite",
      connection: {
        dialect: "sqlite",
        storage: "chinook.sqlite",
        logging: false,
      },
    });
  });

  it("Returns an error for invalid query", async () => {
    const response = await instance.run({
      query: "DELETE FROM users",
    });

    expect(response.result.success).toBe(false);
    expect(response.result.error).toContain("Only SELECT queries are allowed");
  });
});
