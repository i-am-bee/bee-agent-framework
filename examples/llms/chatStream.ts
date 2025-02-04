import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { Message } from "bee-agent-framework/backend/message";
import { Role } from "bee-agent-framework/backend/message";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

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
