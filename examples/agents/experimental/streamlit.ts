import "dotenv/config.js";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { createConsoleReader } from "examples/helpers/io.js";
import { BAMChatLLM } from "bee-agent-framework/adapters/bam/chat";
import { StreamlitAgent } from "bee-agent-framework/agents/experimental/streamlit/agent";

const llm = BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct");

const agent = new StreamlitAgent({
  llm,
  memory: new TokenMemory({ llm }),
});

const reader = createConsoleReader();

try {
  for await (const { prompt } of reader) {
    const response = await agent.run({ prompt }).observe((emitter) => {
      emitter.on("newToken", (data) => {
        reader.write(`Agent (token received) 🤖 : `, data.delta);
      });
    });

    reader.write(`Agent (text) 🤖 : `, response.result.text);
    if (response.result.app) {
      reader.write(`Agent (app) 🤖 : `, response.result.app);
    }
  }
} catch (error) {
  reader.write("Agent (error)  🤖", error(FrameworkError.ensure(error).dump()));
}
