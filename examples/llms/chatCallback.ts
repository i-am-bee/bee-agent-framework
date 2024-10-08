import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

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

        // if you want to close the stream prematurely, just uncomment the following line
        // callbacks.abort()
      }),
    );

  reader.write(`LLM 🤖 (txt) : `, response.getTextContent());
  reader.write(`LLM 🤖 (raw) : `, JSON.stringify(response.finalResult));
}
