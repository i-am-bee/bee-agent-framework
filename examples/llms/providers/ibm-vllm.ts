import "dotenv/config.js";
import { IBMvLLM } from "bee-agent-framework/adapters/ibm-vllm/llm";
import { IBMVllmChatLLM } from "bee-agent-framework/adapters/ibm-vllm/chat";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { Client } from "bee-agent-framework/adapters/ibm-vllm/client";

const client = new Client();
{
  console.info("===RAW===");
  const llm = new IBMvLLM({
    client,
    modelId: "meta-llama/llama-3-1-70b-instruct",
  });

  console.info("Meta", await llm.meta());

  const response = await llm.generate("Hello world!", {
    stream: false,
  });
  console.info(response.text);
}

{
  console.info("===CHAT===");
  const llm = IBMVllmChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct", { client });

  console.info("Meta", await llm.meta());

  const response = await llm.generate([
    BaseMessage.of({
      role: "user",
      text: "Hello world!",
    }),
  ]);
  console.info(response.messages);
}

{
  console.info("===EMBEDDING===");
  const llm = new IBMvLLM({ client, modelId: "baai/bge-large-en-v1.5" });

  const response = await llm.embed([`Hello world!`, `Hello family!`]);
  console.info(response);
}
