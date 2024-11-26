import "dotenv/config.js";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { VertexAILLM } from "bee-agent-framework/adapters/vertexai/llm";
import { VertexAIChatLLM } from "bee-agent-framework/adapters/vertexai/chat";

const project = process.env.GCP_VERTEXAI_PROJECT;
const location = process.env.GCP_VERTEXAI_LOCATION;

if (!project || !location) {
  throw new Error("No ENVs has been set!");
}

{
  console.info("===RAW===");
  const llm = new VertexAILLM({
    modelId: "gemini-1.5-flash-001",
    project,
    location,
    parameters: {},
  });

  console.info("Meta", await llm.meta());

  const response = await llm.generate("Hello world!", {
    stream: true,
  });
  console.info(response.getTextContent());
}

{
  console.info("===CHAT===");
  const llm = new VertexAIChatLLM({
    modelId: "gemini-1.5-flash-001",
    project,
    location,
  });

  console.info("Meta", await llm.meta());

  const response = await llm.generate([
    BaseMessage.of({
      role: "user",
      text: "Hello world!",
    }),
  ]);
  console.info(response.getTextContent());
}
