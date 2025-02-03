import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { Message } from "@/backend/message.js";
import { Role } from "@/backend/message.js";
import { OllamaChatModel } from "@/adapters/ollama/backend/chat.js";

const llm = new OllamaChatModel("llama3.1");

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  for await (const chunk of llm.createStream({
    messages: [
      Message.of({
        role: Role.USER,
        text: prompt,
      }),
    ],
  })) {
    reader.write(`LLM 🤖 (txt) : `, chunk.getTextContent());
    reader.write(`LLM 🤖 (raw) : `, JSON.stringify(chunk.messages));
  }
}
