import "dotenv/config";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { GroqChatLLM } from "bee-agent-framework/adapters/groq/chat";

const llm = new GroqChatLLM({
  modelId: "gemma2-9b-it",
  parameters: {
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 1,
  },
});

console.info("Meta", await llm.meta());
const response = await llm.generate([
  BaseMessage.of({
    role: "user",
    text: "Hello world!",
  }),
]);
console.info(response.getTextContent());
