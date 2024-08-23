import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { Logger } from "@/logger/logger.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";

Logger.root.level = "info"; // or your custom level

const llm = new OllamaChatLLM();

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  for await (const chunk of llm.stream([
    BaseMessage.of({
      role: Role.USER,
      text: prompt,
    }),
  ])) {
    reader.write(`LLM 🤖 (txt) : `, chunk.getTextContent());
    reader.write(`LLM 🤖 (raw) : `, JSON.stringify(chunk.finalResult));
  }
}
