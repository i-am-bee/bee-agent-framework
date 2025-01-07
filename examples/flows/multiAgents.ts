import "dotenv/config";
import { BAMChatLLM } from "bee-agent-framework/adapters/bam/chat";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { createConsoleReader } from "examples/helpers/io.js";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { AgentFlow } from "bee-agent-framework/experimental/flows/agent";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";

const flow = new AgentFlow();
flow.addAgent({
  name: "WeatherForecaster",
  instructions: "You are a weather assistant. Respond only if you can provide a useful answer.",
  tools: [new OpenMeteoTool()],
  llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
});
flow.addAgent({
  name: "Researcher",
  instructions: "You are a researcher assistant. Respond only if you can provide a useful answer.",
  tools: [new WikipediaTool()],
  llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
});

const llm = BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct");
llm.emitter.on("start", (x) => {
  console.info(llm.messagesToPrompt(x.input));
});
flow.addAgent({
  name: "Solver",
  instructions:
    "Your task is to provide the most useful final answer based on the assistants' responses which all are relevant. Ignore those where assistant do not know.",
  tools: [],
  llm,
});

const reader = createConsoleReader();
const memory = new UnconstrainedMemory();

for await (const { prompt } of reader) {
  await memory.add(
    BaseMessage.of({
      role: Role.USER,
      text: prompt,
    }),
  );

  const { result } = await flow.run(memory.messages).observe((emitter) => {
    emitter.on("success", (data) => {
      reader.write(`-> ${data.step}`, data.response?.update?.finalAnswer ?? "-");
    });
  });
  await memory.addMany(result.newMessages);
  reader.write(`Agent 🤖`, result.finalAnswer);
}
