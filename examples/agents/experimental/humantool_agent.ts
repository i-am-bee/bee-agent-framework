import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { sharedConsoleReader } from "bee-agent-framework/helpers/io";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { Logger } from "bee-agent-framework/logger/logger";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { HumanTool } from "bee-agent-framework/tools/human";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

import {
  BeeSystemPrompt,
  BeeAssistantPrompt,
  BeeUserPrompt,
  BeeUserEmptyPrompt,
  BeeToolErrorPrompt,
  BeeToolInputErrorPrompt,
  BeeToolNoResultsPrompt,
  BeeToolNotFoundPrompt,
} from "bee-agent-framework/agents/bee/prompts"; // Updated import path

// Set up logger
Logger.root.level = "silent"; // Disable internal logs
const logger = new Logger({ name: "app", level: "trace" });

// Initialize LLM
const llm = new OllamaChatLLM({
  modelId: "llama3.1", // llama3.1:70b for better performance
});

// Initialize BeeAgent
const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new OpenMeteoTool(), new HumanTool()],
  templates: {
    system: BeeSystemPrompt,
    assistant: BeeAssistantPrompt,
    user: BeeUserPrompt,
    userEmpty: BeeUserEmptyPrompt,
    toolError: BeeToolErrorPrompt,
    toolInputError: BeeToolInputErrorPrompt,
    toolNoResultError: BeeToolNoResultsPrompt,
    toolNotFoundError: BeeToolNotFoundPrompt,
  },
});

// Shared console reader
const reader = sharedConsoleReader();

// Main loop
try {
  for await (const { prompt } of reader) {
    // Run the agent and observe events
    const response = await agent
      .run(
        { prompt },
        {
          execution: {
            maxRetriesPerStep: 3,
            totalMaxRetries: 10,
            maxIterations: 20,
          },
        },
      )
      .observe((emitter) => {
        // Show only final answers
        emitter.on("update", async ({ update }) => {
          if (update.key === "final_answer") {
            reader.write(`Agent 🤖 : `, update.value);
          }
        });

        // Log errors
        emitter.on("error", ({ error }) => {
          reader.write(`Agent 🤖 : `, FrameworkError.ensure(error).dump());
        });

        // Retry notifications
        emitter.on("retry", () => {
          reader.write(`Agent 🤖 : `, "Retrying the action...");
        });
      });

    // Print the final response
    if (response.result?.text) {
      reader.write(`Agent 🤖 : `, response.result.text);
    } else {
      reader.write(
        "Agent 🤖 : ",
        "No result was returned. Ensure your input is valid or check tool configurations.",
      );
    }
  }
} catch (error) {
  logger.error(FrameworkError.ensure(error).dump());
} finally {
  // Gracefully close the reader when exiting the app
  reader.close();
}
