import { Serializable } from "@/internals/serializable.js";
import {
  BeeAgentRunIteration,
  BeeCallbacks,
  BeeIterationToolResult,
  BeeMeta,
  BeeRunInput,
  BeeRunOptions,
} from "@/agents/bee/types.js";
import { BeeAgent, BeeAgentError, BeeInput } from "@/agents/bee/agent.js";
import { RetryCounter } from "@/internals/helpers/counter.js";
import { AgentError } from "@/agents/base.js";
import { shallowCopy } from "@/serializer/utils.js";
import { BaseMemory } from "@/memory/base.js";
import { GetRunContext } from "@/context.js";
import { Emitter } from "@/emitter/emitter.js";

export interface BeeRunnerLLMInput {
  meta: BeeMeta;
  signal: AbortSignal;
  emitter: Emitter<BeeCallbacks>;
}

export interface BeeRunnerToolInput {
  state: BeeIterationToolResult;
  meta: BeeMeta;
  signal: AbortSignal;
  emitter: Emitter<BeeCallbacks>;
}

export abstract class BaseRunner extends Serializable {
  public memory!: BaseMemory;
  public readonly iterations: BeeAgentRunIteration[] = [];
  protected readonly failedAttemptsCounter: RetryCounter;

  constructor(
    protected readonly input: BeeInput,
    protected readonly options: BeeRunOptions,
    protected readonly run: GetRunContext<BeeAgent>,
  ) {
    super();
    this.failedAttemptsCounter = new RetryCounter(options?.execution?.totalMaxRetries, AgentError);
  }

  async createIteration() {
    const meta: BeeMeta = { iteration: this.iterations.length + 1 };
    const maxIterations = this.options?.execution?.maxIterations ?? Infinity;

    if (meta.iteration > maxIterations) {
      throw new BeeAgentError(
        `Agent was not able to resolve the task in ${maxIterations} iterations.`,
        [],
        { isFatal: true },
      );
    }

    const emitter = this.run.emitter.child({ groupId: `iteration-${meta.iteration}` });
    const iteration = await this.llm({ emitter, signal: this.run.signal, meta });
    this.iterations.push(iteration);

    return {
      emitter,
      state: iteration.state,
      meta,
      signal: this.run.signal,
    };
  }

  async init(input: BeeRunInput) {
    this.memory = await this.initMemory(input);
  }

  abstract llm(input: BeeRunnerLLMInput): Promise<BeeAgentRunIteration>;

  abstract tool(input: BeeRunnerToolInput): Promise<{ output: string; success: boolean }>;

  protected abstract initMemory(input: BeeRunInput): Promise<BaseMemory>;

  createSnapshot() {
    return {
      input: shallowCopy(this.input),
      options: shallowCopy(this.options),
      memory: this.memory,
      failedAttemptsCounter: this.failedAttemptsCounter,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
