import "dotenv/config.js";
import { BeeAgent } from "@/agents/bee/agent.js";
import { DuckDuckGoSearchTool } from "@/tools/search/duckDuckGoSearch.js";
import { UnconstrainedMemory } from "@/memory/unconstrainedMemory.js";
import { OpenAIChatLLM } from "@/adapters/openai/chat.js";

// We create an agent
let agent = new BeeAgent({
  llm: new OpenAIChatLLM(),
  tools: [new DuckDuckGoSearchTool()],
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
const json = agent.serialize();

// We reinitialize the agent to the exact state he was
agent = BeeAgent.fromSerialized(json);

// We continue in our conversation
prompt = "When was he born?";
console.info(prompt);
const response2 = await agent.run({
  prompt,
});
console.info(response2.result.text);
