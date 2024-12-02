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

import { GetRunContext, RunInstance } from "@/context.js";
import { FrameworkError } from "@/errors.js";
import { buildModuleUsageMetric, isMeasurementedInstance } from "./opentelemetry.js";
import { GenerateCallbacks } from "@/llms/base.js";
import { createFullPath } from "@/emitter/utils.js";
import { metricReader } from "./sdk.js";

export const activeTracesMap = new Map<string, string>();

/**
 * This middleware collects the usage metrics from framework entities runs and sends them to the central collector
 * @returns
 */
export function createTelemetryMetricsMiddleware() {
  return (context: GetRunContext<RunInstance, unknown>) => {
    const traceId = context.emitter?.trace?.id;
    if (!traceId) {
      throw new FrameworkError(`Fatal error. Missing traceId`, [], { context });
    }
    if (activeTracesMap.has(traceId)) {
      return;
    }
    activeTracesMap.set(traceId, context.instance.constructor.name);

    const { emitter } = context;
    const basePath = createFullPath(emitter.namespace, "");

    const startEventName: keyof GenerateCallbacks = `start`;
    const finishEventName: keyof GenerateCallbacks = `finish`;

    // collect module_usage metric for llm|tool|agent start event
    emitter.match(
      (event) => event.name === startEventName && isMeasurementedInstance(event.creator),
      (_, meta) => buildModuleUsageMetric({ traceId, instance: meta.creator, eventId: meta.id }),
    );

    // send metrics to the public collector
    emitter.match(
      (event) => event.path === `${basePath}.run.${finishEventName}`,
      async () => {
        activeTracesMap.delete(traceId);
        await metricReader.forceFlush();
      },
    );
  };
}
