import "dotenv/config.js";
import { z } from "zod";
import { Message } from "@/backend/message.js";
import { Role } from "@/backend/message.js";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

const llm = new OllamaChatModel("llama3.1");
const response = await llm.createStructure({
  schema: z.union([
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
  messages: [
    Message.of({
      role: Role.USER,
      text: "Generate a profile of a citizen of Europe.",
    }),
  ],
});
console.info(response);
