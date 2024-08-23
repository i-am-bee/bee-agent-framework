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

import { AsyncLocalStorage } from "node:async_hooks";
import { Emitter } from "@/emitter/emitter.js";
import { createRandomHash } from "@/internals/helpers/hash.js";
import { omit } from "remeda";
import { Callback } from "@/emitter/types.js";
import { createNonOverridableObject } from "@/internals/helpers/object.js";
import { registerSignals } from "@/internals/helpers/cancellation.js";
import { Serializable } from "@/internals/serializable.js";
import { LazyPromise } from "@/internals/helpers/promise.js";
import { FrameworkError } from "@/errors.js";

export interface RunInstance<T = any> {
  emitter: Emitter<T>;
}

export interface RunContextCallbacks {
  start: Callback<null>;
  success: Callback<unknown>;
  error: Callback<Error>;
  finish: Callback<null>;
}

export type GetRunContext<T> = T extends RunInstance<infer P> ? RunContext<P> : never;
export type GetRunInstance<T> = T extends RunInstance<infer P> ? P : never;

export class Run<T, C> extends LazyPromise<T> {
  constructor(
    handler: () => Promise<T>,
    protected readonly runContext: RunContext<C>,
  ) {
    super(handler);
  }

  readonly [Symbol.toStringTag] = "Promise";

  observe(fn: (emitter: Emitter<C>) => void) {
    fn(this.runContext.emitter as any);
    return this;
  }

  context(value: object) {
    Object.assign(this.runContext.context, value);
    Object.assign(this.runContext.emitter.context, value);
    return this;
  }

  middleware(fn: (context: RunContext<C>) => void) {
    fn(this.runContext);
    return this;
  }
}

export class RunContext<I> extends Serializable {
  static #storage = new AsyncLocalStorage<RunContext<any>>();

  protected readonly controller: AbortController;
  public readonly runId: string;
  public readonly groupId: string;
  public readonly parentId?: string;
  public readonly emitter;
  public readonly context: object;

  get signal() {
    return this.controller.signal;
  }

  abort() {
    this.controller.abort();
  }

  constructor(
    protected readonly instance: RunInstance<I>,
    parent?: RunContext<any>,
    signal?: AbortSignal,
  ) {
    super();
    this.runId = createRandomHash(5);
    this.parentId = parent?.runId;
    this.groupId = parent?.groupId ?? createRandomHash();
    this.context = createNonOverridableObject(
      omit((parent?.context ?? {}) as any, ["id", "parentId"]),
    );

    this.controller = new AbortController();
    registerSignals(this.controller, [signal, parent?.signal]);

    this.emitter = instance.emitter.child<I>({
      context: this.context,
      trace: {
        id: this.groupId,
        runId: this.runId,
        parentRunId: parent?.runId,
      },
    });
    if (parent) {
      this.emitter.pipe(parent.emitter);
    }
  }

  destroy() {
    this.emitter.destroy();
    this.controller.abort(new FrameworkError("Context destroyed."));
  }

  static enter<A, R>(
    self: RunInstance<A>,
    fn: (context: RunContext<A>) => Promise<R>,
    signal?: AbortSignal,
  ) {
    const parent = RunContext.#storage.getStore();
    const runContext = new RunContext(self, parent, signal);

    return new Run<R, A>(async () => {
      const emitter = runContext.emitter.child<RunContextCallbacks>({
        namespace: ["run"],
        creator: runContext,
        context: { internal: true },
      });

      try {
        await emitter.emit("start", null);
        const result = await Promise.race([
          RunContext.#storage.run(runContext, fn, runContext),
          new Promise<never>((_, reject) =>
            runContext.signal.addEventListener("abort", () => reject(runContext.signal.reason)),
          ),
        ]);
        await emitter.emit("success", result);
        return result;
      } catch (_e) {
        const e = FrameworkError.ensure(_e);
        await emitter.emit("error", e);
        throw e;
      } finally {
        await emitter.emit("finish", null);
        runContext.destroy();
      }
    }, runContext);
  }

  static {
    this.register();
  }

  createSnapshot() {
    return {
      controller: this.controller,
      runId: this.runId,
      groupId: this.groupId,
      parentId: this.parentId,
      emitter: this.emitter,
      context: this.context,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
