import "dotenv/config.js";
import { IBMvLLM } from "bee-agent-framework/adapters/ibm-vllm/llm";
import { IBMVllmChatLLM } from "bee-agent-framework/adapters/ibm-vllm/chat";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

{
  console.info("===RAW===");
  const llm = new IBMvLLM({
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
  const llm = IBMVllmChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct");

  console.info("Meta", await llm.meta());

  const response = await llm.generate([
    BaseMessage.of({
      role: "user",
      text: "Hello world!",
    }),
  ]);
  console.info(response.messages);
}
