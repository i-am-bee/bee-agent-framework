import { OllamaLLM } from "bee-agent-framework/adapters/ollama/llm";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { Ollama } from "ollama";

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

{
  console.info("===REMOTE OLLAMA===");
  const llm = new OllamaChatLLM({
    modelId: "llama3.1",
    client: new Ollama({
      // use the IP for the server you have ollama running on
      host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
    }),
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
