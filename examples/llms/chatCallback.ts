import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { Logger } from "@/logger/logger.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";

Logger.root.level = "info"; // or your custom level

const llm = new OllamaChatLLM();

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  const response = await llm
    .generate(
      [
        BaseMessage.of({
          role: Role.USER,
          text: prompt,
        }),
      ],
      {},
    )
    .observe((emitter) =>
      emitter.match("*", (data, event) => {
        reader.write(`LLM 🤖 (event: ${event.name})`, JSON.stringify(data));

        // if you want to premature close the stream, just uncomment the following line
        // callbacks.abort()
      }),
    );

  reader.write(`LLM 🤖 (txt) : `, response.getTextContent());
  reader.write(`LLM 🤖 (raw) : `, JSON.stringify(response.finalResult));
}
