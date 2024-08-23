import { OllamaLLM } from "@/adapters/ollama/llm.js";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";
import { BaseMessage } from "@/llms/primitives/message.js";

{
  console.info("===RAW===");
  const llm = new OllamaLLM({
    modelId: "llama3.1",
    parameters: {
      num_predict: 10,
      stop: ["post"],
    },
  });

  console.info("Meta", await llm.meta());

  const response = await llm.generate("Hello world!", {
    stream: true,
  });
  console.info(response.finalResult);
}

{
  console.info("===CHAT===");
  const llm = new OllamaChatLLM({
    modelId: "llama3.1",
    parameters: {
      num_predict: 10,
      temperature: 0,
    },
  });

  console.info("Meta", await llm.meta());

  const response = await llm.generate([
    BaseMessage.of({
      role: "user",
      text: "Hello world!",
    }),
  ]);
  console.info(response.finalResult);
}
