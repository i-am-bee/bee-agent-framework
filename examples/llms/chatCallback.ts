import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { Message } from "@/backend/message.js";
import { Role } from "@/backend/message.js";
import { OllamaChatModel } from "@/adapters/ollama/backend/chat.js";

const llm = new OllamaChatModel("llama3.1");

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  const response = await llm
    .create({
      messages: [
        Message.of({
          role: Role.USER,
          text: prompt,
        }),
      ],
    })
    .observe((emitter) =>
      emitter.match("*", (data, event) => {
        reader.write(`LLM 🤖 (event: ${event.name})`, JSON.stringify(data));

        // if you want to close the stream prematurely, just uncomment the following line
        // callbacks.abort()
      }),
    );

  reader.write(`LLM 🤖 (txt) : `, response.getTextContent());
  reader.write(`LLM 🤖 (raw) : `, JSON.stringify(response.messages));
}
