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

import { FrameworkError } from "@/errors.js";
import { AgentMeta } from "@/agents/types.js";
import { Serializable } from "@/internals/serializable.js";
import { GetRunContext, RunContext } from "@/context.js";
import { Emitter } from "@/emitter/emitter.js";
import { BaseMemory } from "@/memory/base.js";
import { createTelemetryMiddleware } from "@/instrumentation/create-telemetry-middleware.js";
import {
  INSTRUMENTATION_ENABLED,
  INSTRUMENTATION_METRICS_ENABLED,
} from "@/instrumentation/config.js";
import { doNothing } from "remeda";
import { createTelemetryMetricsMiddleware } from "@/instrumentation/create-telemetry-metrics-middleware.js";

export class AgentError extends FrameworkError {}

export interface BaseAgentRunOptions {
  signal?: AbortSignal;
}

export abstract class BaseAgent<
  TInput,
  TOutput,
  TOptions extends BaseAgentRunOptions = BaseAgentRunOptions,
> extends Serializable {
  protected isRunning = false;

  public abstract readonly emitter: Emitter<unknown>;

  public run(
    ...[input, options]: Partial<TOptions> extends TOptions
      ? [input: TInput, options?: TOptions]
      : [input: TInput, options: TOptions]
  ) {
    if (this.isRunning) {
      throw new AgentError("Agent is already running!");
    }

    return RunContext.enter(
      this,
      { signal: options?.signal, params: [input, options] as const },
      async (context) => {
        try {
          // @ts-expect-error
          return await this._run(input, options, context);
        } catch (e) {
          if (e instanceof AgentError) {
            throw e;
          } else {
            throw new AgentError(`Error has occurred!`, [e]);
          }
        } finally {
          this.isRunning = false;
        }
      },
    )
      .middleware(INSTRUMENTATION_ENABLED ? createTelemetryMiddleware() : doNothing())
      .middleware(
        INSTRUMENTATION_METRICS_ENABLED ? createTelemetryMetricsMiddleware() : doNothing(),
      );
  }

  protected abstract _run(
    input: TInput,
    options: TOptions,
    run: GetRunContext<typeof this>,
  ): Promise<TOutput>;

  destroy() {
    this.emitter.destroy();
  }

  public abstract get memory(): BaseMemory;
  public abstract get meta(): AgentMeta;

  createSnapshot() {
    return { isRunning: false };
  }
}
