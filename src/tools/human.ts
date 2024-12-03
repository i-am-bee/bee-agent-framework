import { Emitter } from "@/emitter/emitter.js";
import { Tool, BaseToolRunOptions, StringToolOutput, ToolInput, ToolEvents } from "@/tools/base.js";
import { sharedConsoleReader } from "@/helpers/io.js"; // Shared reader
import { z } from "zod";

export class HumanTool extends Tool<StringToolOutput> {
  name = "HumanTool";
  description = "A tool for human intervention during an agent's workflow.";

  public readonly emitter: Emitter<ToolEvents<ToolInput<this>, StringToolOutput>> =
    Emitter.root.child({
      namespace: ["tool", "human"],
      creator: this,
    });

  inputSchema = () =>
    z.object({
      message: z.string().min(1, "Message cannot be empty"),
    });

  async _run(
    input: z.infer<ReturnType<typeof this.inputSchema>>,
    _options: BaseToolRunOptions,
  ): Promise<StringToolOutput> {
    const reader = sharedConsoleReader(); // Use shared reader instance

    reader.write("HumanTool", input.message);

    const userInput = await reader.prompt(); // Wait for user input

    return new StringToolOutput(userInput); // Return the user's input
  }
}
