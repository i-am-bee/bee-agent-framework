import { BaseToolOptions, BaseToolRunOptions, StringToolOutput, Tool } from "@/tools/base.js";
import { z } from "zod";

type ToolOptions = BaseToolOptions;
type ToolRunOptions = BaseToolRunOptions;

export class HelloWorldTool extends Tool<StringToolOutput, ToolOptions, ToolRunOptions> {
  name = "Helloworld";
  description = "Says hello when asked for a special greeting.";

  inputSchema = z.string();

  static {
    this.register();
  }

  protected async _run(input: string, options?: BaseToolRunOptions): Promise<StringToolOutput> {
    return new StringToolOutput(`Hello, ${input}`);
  }
}
