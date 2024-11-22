import { Tool, ToolOutput, BaseToolRunOptions, StringToolOutput } from "@/tools/base.js";
import { createConsoleReader } from "@/helpers/io.js";
import { z } from "zod";

export class HumanTool extends Tool<StringToolOutput> {
  name = "HumanTool";
  description = "A tool for human intervention during an agent's workflow.";

  inputSchema = () => z.object({
    message: z.string().min(1, "Message cannot be empty"),
  });

  async _run(input: z.infer<ReturnType<typeof this.inputSchema>>, options: BaseToolRunOptions): Promise<StringToolOutput> {
    const reader = createConsoleReader({
      input: "Please provide the required information: ",
      allowEmpty: false,
    });

    reader.write("HumanTool", input.message);

    const userInput = await reader.prompt();
    reader.close();

    return new StringToolOutput(userInput);
  }
}