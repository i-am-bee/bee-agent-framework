import "dotenv/config";
import { Message } from "bee-agent-framework/backend/message";
import { WatsonXChatModel } from "bee-agent-framework/adapters/watsonx/backend/chat";

const chatLLM = new WatsonXChatModel("meta-llama/llama-3-1-70b-instruct");

// Log every request
chatLLM.emitter.match("*", async (data, event) => {
  console.info(
    `Time: ${event.createdAt.toISOString().substring(11, 19)}`,
    `Event: ${event.name}`,
    `Data: ${JSON.stringify(data).substring(0, 128).concat("...")}`,
  );
});

const response = await chatLLM.create({
  messages: [
    Message.of({
      role: "user",
      text: "Hello world!",
    }),
  ],
});
console.info(response.messages[0]);
