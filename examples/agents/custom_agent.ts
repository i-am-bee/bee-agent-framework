import { BaseAgent, BaseAgentRunOptions } from "bee-agent-framework/agents/base";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";
import { Emitter } from "bee-agent-framework/emitter/emitter";
import { GetRunContext } from "bee-agent-framework/context";
import { JsonDriver } from "bee-agent-framework/llms/drivers/json";
import { z } from "zod";
import { PromptTemplate } from "bee-agent-framework/template";
import { AgentMeta } from "bee-agent-framework/agents/types";
import { ChatLLM, ChatLLMOutput } from "bee-agent-framework/llms/chat";
import { BaseMemory } from "bee-agent-framework/memory/base";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";

interface RunInput {
  message: BaseMessage;
}

interface RunOutput {
  message: BaseMessage;
  state: {
    thought: string;
    final_answer: string;
  };
}

interface RunOptions extends BaseAgentRunOptions {
  maxRetries?: number;
}

interface AgentInput {
  llm: ChatLLM<ChatLLMOutput>;
  memory: BaseMemory;
}

export class CustomAgent extends BaseAgent<RunInput, RunOutput, RunOptions> {
  protected driver: JsonDriver;
  public readonly memory: BaseMemory;
  public emitter = Emitter.root.child({
    namespace: ["agent", "custom"],
    creator: this,
  });

  protected static systemPrompt = new PromptTemplate({
    schema: z.object({
      schema: z.string().min(1),
    }),
    template: `You are a helpful assistant that generates only valid JSON adhering to the following JSON Schema.

\`\`\`
{{schema}}
\`\`\`

IMPORTANT: Every message must be a parsable JSON string without additional output.
`,
  });

  constructor(input: AgentInput) {
    super();
    this.driver = JsonDriver.fromTemplate(CustomAgent.systemPrompt, input.llm);
    this.memory = input.memory;
  }

  protected async _run(
    input: RunInput,
    options: RunOptions,
    run: GetRunContext<this>,
  ): Promise<RunOutput> {
    const response = await this.driver.generate(
      z.object({
        thought: z
          .string()
          .describe("Describe your thought process before coming with a final answer"),
        final_answer: z
          .string()
          .describe("Here you should provide concise answer to the original question."),
      }),
      [...this.memory.messages, input.message],
      {
        maxRetries: options?.maxRetries,
        options: { signal: run.signal },
      },
    );

    const result = BaseMessage.of({
      role: Role.ASSISTANT,
      text: response.parsed.final_answer,
    });
    await this.memory.add(result);

    return {
      message: result,
      state: response.parsed,
    };
  }

  public get meta(): AgentMeta {
    return {
      name: "CustomAgent",
      description: "Custom Agent is a simple LLM agent.",
      tools: [],
    };
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      driver: this.driver,
      emitter: this.emitter,
      memory: this.memory,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}

const agent = new CustomAgent({
  llm: new OllamaChatLLM(),
  memory: new UnconstrainedMemory(),
});
const response = await agent.run({
  message: BaseMessage.of({ role: Role.USER, text: "Why is the sky blue?" }),
});
console.info(response.state);
