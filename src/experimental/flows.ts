/**
 * Copyright 2024 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z, ZodSchema } from "zod";
import { Serializable } from "@/internals/serializable.js";
import { Callback, Emitter } from "@/emitter/emitter.js";
import { RunContext } from "@/context.js";
import { omit, pick, toCamelCase } from "remeda";
import { shallowCopy } from "@/serializer/utils.js";
import { FrameworkError, ValueError } from "@/errors.js";

export interface FlowStepResponse<T extends ZodSchema, K extends string> {
  update?: Partial<z.output<T>>;
  next?: FlowStepName<K>;
}

export interface FlowRun<T extends ZodSchema, T2 extends ZodSchema, K extends string> {
  result: z.output<T2>;
  steps: FlowStepRes<T, K>[];
  state: z.output<T>;
}

export interface FlowRunOptions<K extends string> {
  start?: K;
  signal?: AbortSignal;
}

export interface FlowStepDef<T extends ZodSchema, K extends string> {
  schema: T;
  handler: FlowStepHandler<T, K>;
}

export interface FlowStepRes<T extends ZodSchema, K extends string> {
  name: K;
  state: z.output<T>;
}

export interface FlowRunContext<T extends ZodSchema, K extends string> {
  steps: FlowStepRes<T, K>[];
  signal: AbortSignal;
  abort: (reason?: Error) => void;
}

export type FlowStepHandler<T extends ZodSchema, K extends string> = (
  state: z.output<T>,
  context: FlowRunContext<T, K>,
) => Promise<FlowStepResponse<T, K>> | FlowStepResponse<T, K>;

export interface FlowEvents<T extends ZodSchema, T2 extends ZodSchema, K extends string> {
  start: Callback<{ step: K; run: FlowRun<T, T2, K> }>;
  error: Callback<{
    step: K;
    error: Error;
    run: FlowRun<T, T2, K>;
  }>;
  success: Callback<{
    step: K;
    response: FlowStepResponse<T, K>;
    run: FlowRun<T, T2, K>;
  }>;
}

interface FlowInput<TS extends ZodSchema, TS2 extends ZodSchema = TS> {
  name?: string;
  schema: TS;
  outputSchema?: TS2;
}

type RunStep<K extends string> = K | typeof Flow.END;
type ReservedStep =
  | typeof Flow.START
  | typeof Flow.NEXT
  | typeof Flow.PREV
  | typeof Flow.END
  | typeof Flow.SELF;
export type FlowStepName<K extends string> = K | ReservedStep;

export class FlowError<
  T extends ZodSchema,
  T2 extends ZodSchema,
  K extends string,
> extends FrameworkError {
  constructor(message: string, extra?: { run?: FlowRun<T, T2, K>; errors?: Error[] }) {
    super(message, extra?.errors, {
      context: extra?.run ?? {},
      isRetryable: false,
      isFatal: true,
    });
  }
}

export class Flow<
  TInput extends ZodSchema,
  TOutput extends ZodSchema = TInput,
  TKeys extends string = string,
> extends Serializable {
  public static readonly START = "__start__";
  public static readonly SELF = "__self__";
  public static readonly PREV = "__prev__";
  public static readonly NEXT = "__next__";
  public static readonly END = "__end__";

  public readonly emitter: Emitter<FlowEvents<TInput, TOutput, TKeys>>;

  protected readonly steps = new Map<string, FlowStepDef<TInput, TKeys>>();
  protected startStep: TKeys | undefined = undefined;

  constructor(protected readonly input: FlowInput<TInput, TOutput>) {
    super();
    this.emitter = Emitter.root.child({
      namespace: ["flow", toCamelCase(input?.name ?? "")].filter(Boolean),
      creator: this,
    });
  }

  getSteps() {
    return Array.from(this.steps.keys()) as TKeys[];
  }

  get name() {
    return this.input.name ?? "";
  }

  get schemas() {
    return pick(this.input, ["schema", "outputSchema"]);
  }

  addStep<L extends string>(
    name: L,
    handler: FlowStepHandler<TInput, TKeys>,
  ): Flow<TInput, TOutput, L | TKeys>;
  addStep<L extends string, TFlow extends AnyFlow>(
    name: L,
    flow: Flow.pipeable<this, TFlow>,
  ): Flow<TInput, TOutput, L | TKeys>;
  addStep<L extends string>(
    name: L,
    step: FlowStepHandler<TInput, TKeys> | AnyFlow,
  ): Flow<TInput, TOutput, L | TKeys> {
    return this._addStep(name, step);
  }

  addStrictStep<L extends string, TI2 extends ZodSchema>(
    name: L,
    schema: TI2,
    handler: FlowStepHandler<TI2, TKeys>,
  ): Flow<TInput, TOutput, L | TKeys>;
  addStrictStep<L extends string, TI2 extends ZodSchema, TFlow extends AnyFlow>(
    name: L,
    schema: TI2,
    flow: Flow.pipeable<Flow<TI2, TOutput, TKeys>, TFlow>,
  ): Flow<TInput, TOutput, L | TKeys>;
  addStrictStep<L extends string, TI2 extends ZodSchema>(
    name: L,
    schema: TI2,
    step: FlowStepHandler<TI2, TKeys> | AnyFlow,
  ): Flow<TInput, TOutput, L | TKeys> {
    return this._addStep(name, schema, step);
  }

  protected _addStep<TI2 extends ZodSchema = TInput, L extends string = TKeys>(
    name: L,
    schemaOrStep: TI2 | FlowStepHandler<TInput, TKeys> | AnyFlow,
    stepOrEmpty?: FlowStepHandler<TI2, TKeys> | AnyFlow,
  ): Flow<TInput, TOutput, L | TKeys> {
    if (!name.trim()) {
      throw new ValueError(`Step name cannot be empty!`);
    }
    if (this.steps.has(name)) {
      throw new ValueError(`Step '${name}' already exists!`);
    }
    if (name === Flow.END) {
      throw new ValueError(`The name '${name}' cannot be used!`);
    }

    const schema = (schemaOrStep && stepOrEmpty ? schemaOrStep : this.input.schema) as TInput;
    const stepOrFlow = stepOrEmpty || schemaOrStep;

    this.steps.set(name, {
      schema,
      handler: stepOrFlow instanceof Flow ? stepOrFlow.asStep({}) : stepOrFlow,
    } as FlowStepDef<TInput, TKeys>);

    return this as unknown as Flow<TInput, TOutput, L | TKeys>;
  }

  setStart(name: TKeys) {
    this.startStep = name;
    return this;
  }

  run(state: z.input<TInput>, options: FlowRunOptions<TKeys> = {}) {
    return RunContext.enter(
      this,
      { signal: options?.signal, params: [state, options] as const },
      async (runContext): Promise<FlowRun<TInput, TOutput, TKeys>> => {
        const run: FlowRun<TInput, TOutput, TKeys> = {
          steps: [],
          state: this.input.schema.parse(state),
          result: undefined as z.output<TOutput>,
        };
        const handlers: FlowRunContext<TInput, TKeys> = {
          steps: run.steps,
          signal: runContext.signal,
          abort: (reason) => runContext.abort(reason),
        };

        let next: RunStep<TKeys> =
          this.findStep(options?.start || this.startStep || this.getSteps()[0]).current ?? Flow.END;

        while (next && next !== Flow.END) {
          const step = this.steps.get(next);
          if (!step) {
            throw new FlowError(`Step '${next}' was not found.`, { run });
          }
          run.steps.push({ name: next, state: run.state });
          await runContext.emitter.emit("start", { run, step: next });
          try {
            const stepInput = await step.schema.parseAsync(run.state).catch((err: Error) => {
              throw new FlowError(
                `Step '${next}' cannot be executed because the provided input doesn't adhere to the step's schema.`,
                { run: shallowCopy(run), errors: [err] },
              );
            });
            const response = await step.handler(stepInput, handlers);
            await runContext.emitter.emit("success", {
              run: shallowCopy(run),
              response,
              step: next,
            });
            if (response.update) {
              run.state = { ...run.state, ...response.update };
            }

            if (response.next === Flow.START) {
              next = run.steps.at(0)?.name!;
            } else if (response.next === Flow.PREV) {
              next = run.steps.at(-2)?.name!;
            } else if (response.next === Flow.NEXT) {
              next = this.findStep(next).next;
            } else if (response.next === Flow.SELF) {
              next = run.steps.at(-1)?.name!;
            } else {
              next = response.next || Flow.END;
            }
          } catch (error) {
            await runContext.emitter.emit("error", {
              run: shallowCopy(run),
              step: next as TKeys,
              error,
            });
            throw error;
          }
        }

        run.result = (this.input.outputSchema ?? this.input.schema).parse(run.state);
        return run;
      },
    );
  }

  delStep<L extends TKeys>(name: L): Flow<TInput, TOutput, Exclude<TKeys, L>> {
    if (this.startStep === name) {
      this.startStep = undefined;
    }
    this.steps.delete(name);
    return this as unknown as Flow<TInput, TOutput, Exclude<TKeys, L>>;
  }

  asStep<
    TInput2 extends ZodSchema = TInput,
    TOutput2 extends ZodSchema = TOutput,
    TKeys2 extends string = TKeys,
  >(overrides: {
    input?: (input: z.output<TInput2>) => z.output<TInput> | z.input<TInput>;
    output?: (output: z.output<TOutput>) => z.output<TOutput2> | z.input<TOutput2>;
    start?: TKeys;
    next?: FlowStepName<TKeys2>;
  }): FlowStepHandler<TInput2, TKeys | TKeys2> {
    return async (input, ctx) => {
      const mappedInput = overrides?.input ? overrides.input(input) : input;
      const result = await this.run(mappedInput, { start: overrides?.start, signal: ctx.signal });
      const mappedOutput = overrides?.output ? overrides.output(result.state) : result.state;

      return {
        update: mappedOutput,
        next: overrides?.next,
      };
    };
  }

  protected findStep(current: TKeys) {
    const steps = this.getSteps();
    const index = steps.indexOf(current);
    return {
      prev: steps[index - 1],
      current: steps[index],
      next: steps[index + 1],
    };
  }

  createSnapshot() {
    return {
      input: omit(this.input, ["schema", "outputSchema"]),
      emitter: this.emitter,
      startStep: this.startStep,
      steps: this.steps,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
    this.input.schema ??= z.any() as unknown as TInput;
    this.input.outputSchema ??= z.any() as unknown as TOutput;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Flow {
  export type pipeable<T extends AnyFlow, T2 extends AnyFlow> =
    Flow.state<T> extends Flow.input<T2> ? T2 : never;
  export type input<T> = T extends Flow<infer A, any, any> ? z.input<A> : never;
  export type state<T> = T extends Flow<infer A, any, any> ? z.output<A> : never;
  export type output<T> = T extends Flow<any, infer A, any> ? z.output<A> : never;
  export type run<T> = T extends Flow<infer A, infer B, infer C> ? FlowRun<A, B, C> : never;
}

export type AnyFlow = Flow<any, any, any>;
