import { BaseAgent, BaseAgentRunOptions } from "bee-agent-framework/agents/base";
import { Message, SystemMessage, UserMessage } from "bee-agent-framework/backend/message";
import { Emitter } from "bee-agent-framework/emitter/emitter";
import { GetRunContext } from "bee-agent-framework/context";
import { z } from "zod";
import { AgentMeta } from "bee-agent-framework/agents/types";
import { BaseMemory } from "bee-agent-framework/memory/base";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { Role } from "bee-agent-framework/backend/message";
import { ChatModel } from "bee-agent-framework/backend/chat";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

interface RunInput {
  message: Message;
}

interface RunOutput {
  message: Message;
  state: {
    thought: string;
    final_answer: string;
  };
}

interface RunOptions extends BaseAgentRunOptions {
  maxRetries?: number;
}

interface AgentInput {
  llm: ChatModel;
  memory: BaseMemory;
}

export class CustomAgent extends BaseAgent<RunInput, RunOutput, RunOptions> {
  public readonly memory: BaseMemory;
  protected readonly model: ChatModel;
  public emitter = Emitter.root.child({
    namespace: ["agent", "custom"],
    creator: this,
  });

  constructor(input: AgentInput) {
    super();
    this.model = input.llm;
    this.memory = input.memory;
  }

  protected async _run(
    input: RunInput,
    options: RunOptions,
    run: GetRunContext<this>,
  ): Promise<RunOutput> {
    const response = await this.model.createStructure({
      schema: z.object({
        thought: z
          .string()
          .describe("Describe your thought process before coming with a final answer"),
        final_answer: z
          .string()
          .describe("Here you should provide concise answer to the original question."),
      }),
      messages: [
        new SystemMessage("You are a helpful assistant. Always use JSON format for you responses."),
        ...this.memory.messages,
        input.message,
      ],
      maxRetries: options?.maxRetries,
      abortSignal: run.signal,
    });

    const result = Message.of({
      role: Role.ASSISTANT,
      text: response.object.final_answer,
    });
    await this.memory.add(result);

    return {
      message: result,
      state: response.object,
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
      emitter: this.emitter,
      memory: this.memory,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}

const agent = new CustomAgent({
  llm: new OllamaChatModel("granite3.1-dense"),
  memory: new UnconstrainedMemory(),
});

const response = await agent.run({
  message: new UserMessage("Why is the sky blue?"),
});
console.info(response.state);
