import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { ArXivTool } from "bee-agent-framework/tools/arxiv";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";

const agent = new BeeAgent({
  llm: new OllamaChatLLM(),
  memory: new UnconstrainedMemory(),
  tools: [new ArXivTool()],
});
