import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

const agent = new BeeAgent({
  llm: new OllamaChatLLM(),
  memory: new UnconstrainedMemory(),
  tools: [],
});

// Matching events on the instance level
agent.emitter.match("*.*", (data, event) => {});

await agent
  .run({
    prompt: "Hello agent!",
  })
  .observe((emitter) => {
    // Matching events on the execution (run) level
    emitter.match("*.*", (data, event) => {
      console.info(`RUN LOG: received event '${event.path}'`);
    });
  });
