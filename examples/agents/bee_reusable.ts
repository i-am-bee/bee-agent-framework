import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { OpenAIChatLLM } from "bee-agent-framework/adapters/openai/chat";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";

// We create an agent
let agent = new BeeAgent({
  llm: new OpenAIChatLLM(),
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
