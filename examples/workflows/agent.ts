import "dotenv/config";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { z } from "zod";
import { Message, UserMessage } from "bee-agent-framework/backend/message";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { ReadOnlyMemory } from "bee-agent-framework/memory/base";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { Workflow } from "bee-agent-framework/experimental/workflows/workflow";
import { createConsoleReader } from "examples/helpers/io.js";
import { GroqChatModel } from "bee-agent-framework/adapters/groq/backend/chat";

const schema = z.object({
  answer: z.instanceof(Message).optional(),
  memory: z.instanceof(ReadOnlyMemory),
});

const workflow = new Workflow({ schema: schema })
  .addStep("simpleAgent", async (state) => {
    const simpleAgent = new BeeAgent({
      llm: new GroqChatModel("llama-3.3-70b-versatile"),
      tools: [],
      memory: state.memory,
    });
    const answer = await simpleAgent.run({ prompt: null });
    reader.write("🤖 Simple Agent", answer.result.text);

    return {
      update: { answer: answer.result },
      next: "critique",
    };
  })
  .addStrictStep("critique", schema.required(), async (state) => {
    const llm = new GroqChatModel("llama-3.3-70b-versatile");
    const { object: critiqueResponse } = await llm.createStructure({
      schema: z.object({ score: z.number().int().min(0).max(100) }),
      messages: [
        Message.of({
          role: "system",
          text: `You are an evaluation assistant who scores the credibility of the last assistant's response. Chitchatting always has a score of 100. If the assistant was unable to answer the user's query, then the score will be 0.`,
        }),
        ...state.memory.messages,
        state.answer,
      ],
    });
    reader.write("🧠 Score", critiqueResponse.score.toString());

    return {
      next: critiqueResponse.score < 75 ? "complexAgent" : Workflow.END,
    };
  })
  .addStep("complexAgent", async (state) => {
    const complexAgent = new BeeAgent({
      llm: new GroqChatModel("llama-3.3-70b-versatile"),
      tools: [new WikipediaTool(), new OpenMeteoTool()],
      memory: state.memory,
    });
    const { result } = await complexAgent.run({ prompt: null });
    reader.write("🤖 Complex Agent", result.text);
    return { update: { answer: result } };
  })
  .setStart("simpleAgent");

const reader = createConsoleReader();
const memory = new UnconstrainedMemory();

for await (const { prompt } of reader) {
  const userMessage = new UserMessage(prompt);
  await memory.add(userMessage);

  const response = await workflow.run({
    memory: memory.asReadOnly(),
  });
  await memory.add(response.state.answer!);

  reader.write("🤖 Final Answer", response.state.answer!.text);
}
