import { ArXivTool } from "beeai-framework/tools/arxiv";
import { BeeAgent } from "beeai-framework/agents/bee/agent";
import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { OllamaChatModel } from "beeai-framework/adapters/ollama/backend/chat";

const agent = new BeeAgent({
  llm: new OllamaChatModel("llama3.1"),
  memory: new UnconstrainedMemory(),
  tools: [new ArXivTool()],
});
