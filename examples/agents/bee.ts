import "dotenv/config.js";
import { BeeAgent } from "@/agents/bee/agent.js";
import { createConsoleReader } from "../helpers/io.js";
import { FrameworkError } from "@/errors.js";
import { TokenMemory } from "@/memory/tokenMemory.js";
import { Logger } from "@/logger/logger.js";
import { PythonTool } from "@/tools/python/python.js";
import { LocalPythonStorage } from "@/tools/python/storage.js";
import { DuckDuckGoSearchTool } from "@/tools/search/duckDuckGoSearch.js";
import { WikipediaTool } from "@/tools/search/wikipedia.js";
import { OpenMeteoTool } from "@/tools/weather/openMeteo.js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";

Logger.root.level = "silent"; // disable internal logs
const logger = new Logger({ name: "app", level: "trace" });

const llm = new OllamaChatLLM({
  modelId: "llama3.1", // llama3.1:70b for better performance
});

const codeInterpreterUrl = process.env.CODE_INTERPRETER_URL;
const __dirname = dirname(fileURLToPath(import.meta.url));

const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [
    new DuckDuckGoSearchTool(),
    // new WebCrawlerTool(), // HTML web page crawler
    new WikipediaTool(),
    new OpenMeteoTool(), // weather tool
    // new ArXivTool(), // research papers
    // new DynamicTool() // custom python tool
    ...(codeInterpreterUrl
      ? [
          new PythonTool({
            codeInterpreter: { url: codeInterpreterUrl },
            storage: new LocalPythonStorage({
              interpreterWorkingDir: `${__dirname}/tmp/code_interpreter`,
              localWorkingDir: `${__dirname}/tmp/local`,
            }),
          }),
        ]
      : []),
  ],
});

const reader = createConsoleReader();
if (codeInterpreterUrl) {
  reader.write("🛠️ System", "Please ensure that the code interpreter is running.");
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
          // log 'data' to see the whole state
          // to log only valid runs (no errors), check if meta.success === true
          reader.write(`Agent (${update.key}) 🤖 : `, update.value);
        });
        emitter.on("partialUpdate", ({ data, update, meta }) => {
          // ideal for streaming (line by line)
          // log 'data' to see the whole state
          // to log only valid runs (no errors), check if meta.success === true
          // reader.write(`Agent (partial ${update.key}) 🤖 : `, update.value);
        });

        // To observe all events (uncomment following block)
        // emitter.match("*.*", async (data: unknown, event) => {
        //   logger.trace(event, `Received event "${event.path}"`);
        // });
      });

    reader.write(`Agent 🤖 : `, response.result.text);
  }
} catch (error) {
  logger.error(FrameworkError.ensure(error).dump());
} finally {
  process.exit(0);
}
