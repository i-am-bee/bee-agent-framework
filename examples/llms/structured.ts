import "dotenv/config.js";
import { z } from "zod";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";

const llm = new OllamaChatLLM();
const response = await llm.generateStructured(
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
      text: "Generate a profile of a citizen of Europe.", // feel free to update it
    }),
  ],
);
console.info(response);
process.exit(0);
