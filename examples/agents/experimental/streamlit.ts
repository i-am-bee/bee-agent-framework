import "dotenv/config.js";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { createConsoleReader } from "examples/helpers/io.js";
import { StreamlitAgent } from "bee-agent-framework/agents/experimental/streamlit/agent";
import { WatsonxChatModel } from "bee-agent-framework/adapters/watsonx/backend/chat";

const llm = new WatsonxChatModel("meta-llama/llama-3-3-70b-instruct");

const agent = new StreamlitAgent({
  llm,
  memory: new TokenMemory(),
});

const reader = createConsoleReader();

try {
  for await (const { prompt } of reader) {
    const response = await agent.run({ prompt }).observe((emitter) => {
      emitter.on("newToken", (data) => {
        reader.write(`Agent (token received) 🤖 : `, data.delta);
      });
    });

    for (const block of response.result.blocks) {
      reader.write(`Agent (${block.name}) 🤖 : `, block.content);
    }
  }
} catch (error) {
  reader.write("Agent (error)  🤖", FrameworkError.ensure(error).dump());
}
