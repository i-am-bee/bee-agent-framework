import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

// We create an agent
let agent = new BeeAgent({
  llm: new OllamaChatModel("llama3.1"),
  tools: [new WikipediaTool()],
  memory: new UnconstrainedMemory(),
});

// We ask the agent
let prompt = "Who is the president of USA?";
console.info(prompt);
const response = await agent.run({
  prompt,
});
console.info(response.result.text);

// We can save (serialize) the agent
const json = await agent.serialize();

// We reinitialize the agent to the exact state he was
agent = await BeeAgent.fromSerialized(json);

// We continue in our conversation
prompt = "When was he born?";
console.info(prompt);
const response2 = await agent.run({
  prompt,
});
console.info(response2.result.text);
