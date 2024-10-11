import "dotenv/config.js";
import { z } from "zod";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { JsonDriver } from "bee-agent-framework/llms/drivers/json";

const llm = new OllamaChatLLM();
const driver = new JsonDriver(llm);
const response = await driver.generate(
  z.union([
    z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      address: z.string(),
      age: z.number().int().min(1),
      hobby: z.string(),
    }),
    z.object({
      error: z.string(),
    }),
  ]),
  [
    BaseMessage.of({
      role: Role.USER,
      text: "Generate a profile of a citizen of Europe.",
    }),
  ],
);
console.info(response);
