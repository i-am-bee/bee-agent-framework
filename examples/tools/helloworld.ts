import { BaseToolOptions, BaseToolRunOptions, StringToolOutput, Tool } from "@/tools/base.js";
import { z } from "zod";

type ToolOptions = BaseToolOptions;
type ToolRunOptions = BaseToolRunOptions;

export class HelloWorldTool extends Tool<StringToolOutput, ToolOptions, ToolRunOptions> {
  name = "HelloWorld";
  description = "Says hello when asked for a special greeting.";

  inputSchema = z.object({
    identifier: z
      .string()
      .describe("The identifier (person, object, animal, etc.) used to when saying Hello"),
  });

  static {
    this.register();
  }

  protected async _run(input: string): Promise<StringToolOutput> {
    return new StringToolOutput(`Hello, ${input}`);
  }
}
