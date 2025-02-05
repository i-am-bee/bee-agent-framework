import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { Message } from "bee-agent-framework/backend/message";
import { Role } from "bee-agent-framework/backend/message";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

const llm = new OllamaChatModel("llama3.1");

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  const response = await llm.create({
    messages: [
      Message.of({
        role: Role.USER,
        text: prompt,
      }),
    ],
  });
  reader.write(`LLM 🤖 (txt) : `, response.getTextContent());
  reader.write(`LLM 🤖 (raw) : `, JSON.stringify(response.messages));
}
