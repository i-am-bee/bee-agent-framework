import "dotenv/config";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { WatsonXChatLLM } from "bee-agent-framework/adapters/watsonx/chat";
import { WatsonXLLM } from "bee-agent-framework/adapters/watsonx/llm";
import { PromptTemplate } from "bee-agent-framework/template";
import { z } from "zod";

const template = new PromptTemplate({
  schema: z.object({
    messages: z.array(z.record(z.array(z.string()))),
  }),
  template: `{{#messages}}{{#system}}<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{{system}}<|eot_id|>{{/system}}{{#user}}<|start_header_id|>user<|end_header_id|>

{{user}}<|eot_id|>{{/user}}{{#assistant}}<|start_header_id|>assistant<|end_header_id|>

{{assistant}}<|eot_id|>{{/assistant}}{{#ipython}}<|start_header_id|>ipython<|end_header_id|>

{{ipython}}<|eot_id|>{{/ipython}}{{/messages}}<|start_header_id|>assistant<|end_header_id|>
`,
});

const llm = new WatsonXLLM({
  modelId: "meta-llama/llama-3-1-70b-instruct",
  projectId: process.env.WATSONX_PROJECT_ID,
  apiKey: process.env.WATSONX_API_KEY,
  region: process.env.WATSONX_REGION, // (optional) default is us-south
  parameters: {
    decoding_method: "greedy",
    max_new_tokens: 50,
  },
});

const chatLLM = new WatsonXChatLLM({
  llm,
  config: {
    messagesToPrompt(messages: BaseMessage[]) {
      return template.render({
        messages: messages.map((message) => ({
          system: message.role === "system" ? [message.text] : [],
          user: message.role === "user" ? [message.text] : [],
          assistant: message.role === "assistant" ? [message.text] : [],
          ipython: message.role === "ipython" ? [message.text] : [],
        })),
      });
    },
  },
});

console.info("Meta", await chatLLM.meta());

const response = await chatLLM.generate([
  BaseMessage.of({
    role: "user",
    text: "Hello world!",
  }),
]);
console.info(response.messages[0]);
