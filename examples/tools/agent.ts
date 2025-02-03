import { ArXivTool } from "bee-agent-framework/tools/arxiv";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

const agent = new BeeAgent({
  llm: new OllamaChatModel("llama3.1"),
  memory: new UnconstrainedMemory(),
  tools: [new ArXivTool()],
});
