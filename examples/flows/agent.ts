import "dotenv/config";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { BAMChatLLM } from "bee-agent-framework/adapters/bam/chat";
import { z } from "zod";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { JsonDriver } from "bee-agent-framework/llms/drivers/json";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { ReadOnlyMemory } from "bee-agent-framework/memory/base";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { Flow } from "bee-agent-framework/experimental/flows/flow";
import { createConsoleReader } from "examples/helpers/io.js";

const schema = z.object({
  answer: z.instanceof(BaseMessage).optional(),
  memory: z.instanceof(ReadOnlyMemory),
});

const workflow = new Flow({ schema: schema })
  .addStep("simpleAgent", async (state) => {
    const simpleAgent = new BeeAgent({
      llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
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
    const llm = BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct");
    const { parsed: critiqueResponse } = await new JsonDriver(llm).generate(
      z.object({ score: z.number().int().min(0).max(100) }),
      [
        BaseMessage.of({
          role: "system",
          text: `You are an evaluation assistant who scores the credibility of the last assistant's response. Chitchatting always has a score of 100. If the assistant was unable to answer the user's query, then the score will be 0.`,
        }),
        ...state.memory.messages,
        state.answer,
      ],
    );
    reader.write("🧠 Score", critiqueResponse.score.toString());

    return {
      next: critiqueResponse.score < 75 ? "complexAgent" : Flow.END,
    };
  })
  .addStep("complexAgent", async (state) => {
    const complexAgent = new BeeAgent({
      llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
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
  const userMessage = BaseMessage.of({ role: "user", text: prompt });
  await memory.add(userMessage);

  const response = await workflow.run({
    memory: memory.asReadOnly(),
  });
  await memory.add(response.state.answer!);

  reader.write("🤖 Final Answer", response.state.answer!.text);
}
