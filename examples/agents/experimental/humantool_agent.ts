import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { sharedConsoleReader } from "bee-agent-framework/helpers/io";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { Logger } from "bee-agent-framework/logger/logger";
import { PythonTool } from "bee-agent-framework/tools/python/python";
import { LocalPythonStorage } from "bee-agent-framework/tools/python/storage";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { HumanTool } from "bee-agent-framework/tools/human";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenAIChatLLM } from "bee-agent-framework/adapters/openai/chat";

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

import { BeeSystemPromptWithHumanTool } from "../../../src/agents/experimental/human/prompts.js";

// Set up logger
Logger.root.level = "silent"; // Disable internal logs
const logger = new Logger({ name: "app", level: "trace" });

// Initialize LLM
const llm = new OpenAIChatLLM({
  modelId: "gpt-4o", // Model ID
});

// Configurations
const codeInterpreterUrl = process.env.CODE_INTERPRETER_URL;
const useHumanTool = process.env.USE_HUMAN_TOOL === "true"; // Toggle HumanTool support
const __dirname = dirname(fileURLToPath(import.meta.url));

// Directories for temporary storage
const codeInterpreterTmpdir =
  process.env.CODE_INTEPRETER_TMPDIR ?? "./examples/tmp/code_interpreter";
const localTmpdir = process.env.LOCAL_TMPDIR ?? "./examples/tmp/local";

// Initialize BeeAgent
const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [
    new DuckDuckGoSearchTool(),
    new WikipediaTool(),
    new OpenMeteoTool(),
    ...(useHumanTool ? [new HumanTool()] : []), // Conditionally include HumanTool
    ...(codeInterpreterUrl
      ? [
          new PythonTool({
            codeInterpreter: { url: codeInterpreterUrl },
            storage: new LocalPythonStorage({
              interpreterWorkingDir: `${__dirname}/../../${codeInterpreterTmpdir}`,
              localWorkingDir: `${__dirname}/../../${localTmpdir}`,
            }),
          }),
        ]
      : []),
  ],
  templates: {
    system: useHumanTool ? BeeSystemPromptWithHumanTool : BeeSystemPrompt,
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

if (codeInterpreterUrl) {
  reader.write(
    "🛠️ System",
    `The code interpreter tool is enabled. Please ensure that it is running on ${codeInterpreterUrl}`,
  );
}

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
