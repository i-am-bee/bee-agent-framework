import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { createConsoleReader } from "../../helpers/io.js";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { Logger } from "bee-agent-framework/logger/logger";
import { PythonTool } from "bee-agent-framework/tools/python/python";
import { LocalPythonStorage } from "bee-agent-framework/tools/python/storage";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { HumanTool } from "@/tools/human.js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenAIChatLLM } from "bee-agent-framework/adapters/openai/chat";

import {
  BeeSystemPrompt,
  BeeSystemPromptWithHumanTool,
  BeeAssistantPrompt,
  BeeUserPrompt,
  BeeUserEmptyPrompt,
  BeeToolErrorPrompt,
  BeeToolInputErrorPrompt,
  BeeToolNoResultsPrompt,
  BeeToolNotFoundPrompt,
} from "@/agents/bee/prompts.js";

Logger.root.level = "silent"; // Disable internal logs
const logger = new Logger({ name: "app", level: "trace" });

const llm = new OpenAIChatLLM({
  modelId: "gpt-4o", // gpt-4o
});

const codeInterpreterUrl = process.env.CODE_INTERPRETER_URL;
const useHumanTool = process.env.USE_HUMAN_TOOL === "true"; // Toggle HumanTool support
const __dirname = dirname(fileURLToPath(import.meta.url));

const codeInterpreterTmpdir =
  process.env.CODE_INTEPRETER_TMPDIR ?? "./examples/tmp/code_interpreter";
const localTmpdir = process.env.LOCAL_TMPDIR ?? "./examples/tmp/local";

const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [
    new DuckDuckGoSearchTool(),
    // new WebCrawlerTool(), // HTML web page crawler
    new WikipediaTool(),
    new OpenMeteoTool(), // Weather tool
    ...(useHumanTool ? [new HumanTool()] : []), // Conditionally include HumanTool
    // new ArXivTool(), // Research papers tool
    // new DynamicTool(), // Custom Python tool
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

const reader = createConsoleReader();
if (codeInterpreterUrl) {
  reader.write(
    "🛠️ System",
    `The code interpreter tool is enabled. Please ensure that it is running on ${codeInterpreterUrl}`,
  );
}

try {
  for await (const { prompt } of reader) {
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
        // Uncomment this to log when a new iteration starts
        // emitter.on("start", () => {
        //   reader.write(`Agent 🤖 : `, "starting new iteration");
        // });
        emitter.on("error", ({ error }) => {
          reader.write(`Agent 🤖 : `, FrameworkError.ensure(error).dump());
        });
        emitter.on("retry", () => {
          reader.write(`Agent 🤖 : `, "retrying the action...");
        });
        emitter.on("update", async ({ data, update, meta }) => {
          // Log 'data' to see the whole state
          // To log only valid runs (no errors), check if meta.success === true
          reader.write(`Agent (${update.key}) 🤖 : `, update.value);
        });
        emitter.on("partialUpdate", ({ data, update, meta }) => {
          // Ideal for streaming (line by line)
          // Log 'data' to see the whole state
          // To log only valid runs (no errors), check if meta.success === true
          // reader.write(`Agent (partial ${update.key}) 🤖 : `, update.value);
        });

        // To observe all events
        // emitter.match("*.*", async (data: unknown, event) => {
        //   logger.trace(event, `Received event "${event.path}"`);
        // });

        // To get raw LLM input
        // emitter.match(
        //   (event) => event.creator === llm && event.name === "start",
        //   async (data: InferCallbackValue<GenerateCallbacks["start"]>, event) => {
        //     logger.trace(
        //       event,
        //       [
        //         `Received LLM event "${event.path}"`,
        //         JSON.stringify(data.input), // Array of messages
        //       ].join("\n"),
        //     );
        //   },
        // );
      });

    reader.write(`Agent 🤖 : `, response.result.text);
  }
} catch (error) {
  logger.error(FrameworkError.ensure(error).dump());
} finally {
  reader.close();
}