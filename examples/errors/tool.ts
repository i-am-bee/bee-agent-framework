import { DynamicTool, ToolError } from "bee-agent-framework/tools/base";
import { FrameworkError } from "bee-agent-framework/errors";
import { z } from "zod";

const tool = new DynamicTool({
  name: "dummy",
  description: "dummy",
  inputSchema: z.object({}),
  handler: async () => {
    throw new Error("Division has failed.");
  },
});

try {
  await tool.run({});
} catch (e) {
  const err = e as FrameworkError;
  console.log(e instanceof ToolError); // true
  console.log("===DUMP===");
  console.log(err.dump());

  console.log("===EXPLAIN===");
  console.log(err.explain());
}
