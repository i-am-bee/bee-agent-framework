import { ChatModel, Message, Role } from "bee-agent-framework/backend/core";
import { z } from "zod";

const model = await ChatModel.fromName("ollama:llama3.1");
const response = await model.createStructure({
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
console.log(response.object);
