import "dotenv/config";
import { LLMTool } from "bee-agent-framework/tools/llm";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { Tool } from "bee-agent-framework/tools/base";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const memory = new UnconstrainedMemory();
await memory.addMany([
  BaseMessage.of({ role: "system", text: "You are a helpful assistant." }),
  BaseMessage.of({ role: "user", text: "Hello!" }),
  BaseMessage.of({ role: "assistant", text: "Hello user. I am here to help you." }),
]);

const tool = new LLMTool({
  llm: new OllamaChatLLM(),
});

const response = await tool
  .run({
    task: "Classify whether the tone of text is POSITIVE/NEGATIVE/NEUTRAL.",
  })
  .context({
    // if the context is not passed, the tool will throw an error
    [Tool.contextKeys.Memory]: memory,
  });

console.info(response.getTextContent());
