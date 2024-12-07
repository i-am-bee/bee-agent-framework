import { Emitter } from "bee-agent-framework/emitter/emitter";
import {
  Tool,
  BaseToolRunOptions,
  StringToolOutput,
  ToolInput,
  ToolEvents,
} from "bee-agent-framework/tools/base";
import { z } from "zod";

export class HumanTool extends Tool<StringToolOutput> {
  name = "HumanTool";
  description = `
  This tool is used whenever the user's input is unclear, ambiguous, or incomplete. 
  The agent MUST invoke this tool when additional clarification is required to proceed. 
  The output must adhere strictly to the following structure:
    - Thought: A single-line description of the need for clarification.
    - Function Name: HumanTool
    - Function Input: { "message": "Your question to the user for clarification." }
    - Function Output: The user's response in JSON format.
  Examples:
    - Example 1:
      Input: "What is the weather?"
      Thought: "The user's request lacks a location. I need to ask for clarification."
      Function Name: HumanTool
      Function Input: { "message": "Could you provide the location for which you would like to know the weather?" }
      Function Output: { "clarification": "Santa Fe, Argentina" }
      Final Answer: The current weather in Santa Fe, Argentina is 17.3°C with a relative humidity of 48% and a wind speed of 10.1 km/h.

    - Example 2:
      Input: "Can you help me?"
      Thought: "The user's request is too vague. I need to ask for more details."
      Function Name: HumanTool
      Function Input: { "message": "Could you clarify what kind of help you need?" }
      Function Output: { "clarification": "I need help understanding how to use the project management tool." }
      Final Answer: Sure, I can help you with the project management tool. Let me know which feature you'd like to learn about or if you'd like a general overview.

    - Example 3:
      Input: "Translate this sentence."
      Thought: "The user's request is incomplete. I need to ask for the sentence they want translated."
      Function Name: HumanTool
      Function Input: { "message": "Could you specify the sentence you would like me to translate?" }
      Function Output: { "clarification": "Translate 'Hello, how are you?' to French." }
      Final Answer: The French translation of 'Hello, how are you?' is 'Bonjour, comment vas-tu?'

  Note: Do NOT attempt to guess or provide incomplete responses. Always use this tool when in doubt to ensure accurate and meaningful interactions.
`;

  public readonly emitter: Emitter<ToolEvents<ToolInput<this>, StringToolOutput>> =
    Emitter.root.child({
      namespace: ["tool", "human"],
      creator: this,
    });

  private reader: ReturnType<typeof import("../../helpers/io.js").createConsoleReader>;

  constructor(reader: ReturnType<typeof import("../../helpers/io.js").createConsoleReader>) {
    super();
    this.reader = reader;
  }

  inputSchema = () =>
    z.object({
      message: z.string().min(1, "Message cannot be empty"),
    });

  async _run(
    input: z.infer<ReturnType<typeof this.inputSchema>>,
    _options: BaseToolRunOptions,
  ): Promise<StringToolOutput> {
    // Use the shared reader instance provided to the constructor
    this.reader.write("HumanTool", input.message);

    // Use askSingleQuestion instead of prompt to avoid interfering with main loop iterator
    const userInput = await this.reader.askSingleQuestion("User 👤 : ");

    // Format the output as required
    const formattedOutput = `{
      "clarification": "${userInput.trim()}"
    }`;

    return new StringToolOutput(formattedOutput);
  }
}
