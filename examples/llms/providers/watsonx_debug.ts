import "dotenv/config";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { WatsonXChatLLM } from "bee-agent-framework/adapters/watsonx/chat";

const chatLLM = WatsonXChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct", {
  apiKey: process.env.WATSONX_API_KEY,
  projectId: process.env.WATSONX_PROJECT_ID,
  region: process.env.WATSONX_REGION, // (optional) default is us-south
  parameters: {
    decoding_method: "greedy",
    max_new_tokens: 50,
  },
});

// Log every request
chatLLM.llm.client.emitter.match("*", async (data, event) => {
  console.info(
    `Time: ${event.createdAt.toISOString().substring(11, 19)}`,
    `Event: ${event.name}`,
    `Data: ${JSON.stringify(data).substring(0, 128).concat("...")}`,
  );
});

chatLLM.llm.client.emitter.on("fetchStart", async (data, event) => {
  console.info(`Fetching ${data.input.url}`);
  // You can also change the 'data' object
});

chatLLM.llm.client.emitter.on("streamStart", async (data, event) => {
  console.info(`Streaming ${data.input.url}`);
  // You can also change the 'data' object
});

console.info("Meta", await chatLLM.meta());

const response = await chatLLM.generate(
  [
    BaseMessage.of({
      role: "user",
      text: "Hello world!",
    }),
  ],
  {
    stream: true,
  },
);
console.info(response.messages[0]);
