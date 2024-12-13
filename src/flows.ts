import { ZodSchema, z } from "zod";
import { Serializable } from "@/internals/serializable.js";
import { Callback, Emitter } from "@/emitter/emitter.js";
import { RunContext } from "@/context.js";
import { omit, pick, toCamelCase } from "remeda";
import { shallowCopy } from "@/serializer/utils.js";
import { FrameworkError } from "@/errors.js";

export interface FlowStepResponse<T extends ZodSchema, K extends string> {
  update?: Partial<z.output<T>>;
  next?: FlowNextStep<K>;
}

export interface FlowRun<T extends ZodSchema, T2 extends ZodSchema, K extends string> {
  result: z.output<T2>;
  steps: FlowStepRes<T, K>[];
  state: z.output<T>;
}

export interface FlowRunOptions {
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

type FlowNextStep<K extends string> = K | typeof Flow.END;

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
  public static readonly END = "__end__";
  public readonly emitter: Emitter<FlowEvents<TInput, TOutput, TKeys>>;

  protected readonly steps = new Map<string, FlowStepDef<TInput, TKeys>>();
  protected startStep: TKeys | null = null;

  constructor(protected readonly input: FlowInput<TInput, TOutput>) {
    super();
    this.emitter = Emitter.root.child({
      namespace: ["flow", toCamelCase(input?.name ?? "")].filter(Boolean),
      creator: this,
    });
  }

  get schemas() {
    return pick(this.input, ["schema", "outputSchema"]);
  }

  addStep<L extends string>(
    name: L,
    step: FlowStepHandler<TInput, TKeys>,
  ): Flow<TInput, TOutput, L | TKeys>;
  addStep<L extends string, TI2 extends ZodSchema>(
    name: L,
    schema: TI2,
    step: FlowStepHandler<TI2, TKeys>,
  ): Flow<TInput, TOutput, L | TKeys>;
  addStep<L extends string, TI2 extends ZodSchema = TInput>(
    name: L,
    schemaOrStep: TI2 | FlowStepHandler<TInput, TKeys>,
    step?: FlowStepHandler<TI2, TKeys>,
  ): Flow<TInput, TOutput, L | TKeys> {
    if (this.steps.has(name)) {
      throw new FlowError(`Step '${name}' already exists!`);
    }
    if (name === Flow.END) {
      throw new FlowError(`The name '${name}' cannot be used!`);
    }

    if (schemaOrStep && step) {
      // @ts-expect-error
      this.steps.set(name, { handler: step, schema: schemaOrStep });
    } else if (typeof schemaOrStep === "function") {
      this.steps.set(name, { handler: schemaOrStep, schema: this.input.schema });
    } else {
      throw new FlowError(`Wrong parameters provided. Neither 'schema' nor 'node' were provided.`);
    }

    return this as Flow<TInput, TOutput, L | TKeys>;
  }

  setStart(name: TKeys) {
    this.startStep = name;
    return this;
  }

  run(state: z.input<TInput>, options: FlowRunOptions = {}) {
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

        let stepName = this.startStep ?? this.findNextStep();
        while (stepName !== Flow.END) {
          const step = this.steps.get(stepName);
          if (!step) {
            throw new FlowError(`Step '${stepName}' was not found.`, { run });
          }
          run.steps.push({ name: stepName, state: run.state });
          await runContext.emitter.emit("start", { run, step: stepName });
          try {
            const stepInput = await step.schema.parseAsync(run.state).catch((err: Error) => {
              throw new FlowError(
                `Step '${stepName}' cannot be executed because the provided input doesn't adhere to the step's schema.`,
                { run: shallowCopy(run), errors: [err] },
              );
            });
            const response = await step.handler(stepInput, handlers);
            await runContext.emitter.emit("success", {
              run: shallowCopy(run),
              response,
              step: stepName as TKeys,
            });
            if (response.update) {
              run.state = { ...run.state, ...response.update };
            }
            stepName = response.next || this.findNextStep(stepName);
          } catch (error) {
            await runContext.emitter.emit("error", {
              run: shallowCopy(run),
              step: stepName as TKeys,
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
      this.startStep = null;
    }
    this.steps.delete(name);
    return this as unknown as Flow<TInput, TOutput, Exclude<TKeys, L>>;
  }

  protected findNextStep(start: TKeys | null = null): FlowNextStep<TKeys> {
    const keys = Array.from(this.steps.keys()) as TKeys[];
    const curIndex = start ? keys.indexOf(start) : -1;
    return keys[curIndex + 1] ?? Flow.END;
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
  export type input<T> = T extends Flow<infer A, any, any> ? z.input<A> : never;
  export type output<T> = T extends Flow<any, infer A, any> ? z.output<A> : never;
  export type run<T> = T extends Flow<infer A, infer B, infer C> ? FlowRun<A, B, C> : never;
}
