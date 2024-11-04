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

import { getSerializedObjectSafe } from "./helpers/get-serialized-object-safe.js";
import { createSpan } from "./helpers/create-span.js";
import { IdNameManager } from "./helpers/id-name-manager.js";
import { getErrorSafe } from "./helpers/get-error-safe.js";
import { isDeepEqual, isEmpty } from "remeda";
import type { BeeCallbacks } from "@/agents/bee/types.js";
import type { InferCallbackValue } from "@/emitter/types.js";
import type { GenerateCallbacks } from "@/llms/base.js";
import { FrameworkError } from "@/errors.js";
import { Version } from "@/version.js";
import { Role } from "@/llms/primitives/message.js";
import type { GetRunContext, RunInstance } from "@/context.js";
import type { GeneratedResponse, FrameworkSpan } from "./types.js";
import { activeTracesMap, buildTraceTree } from "./tracer.js";
import { traceSerializer } from "./helpers/trace-serializer.js";
import { INSTRUMENTATION_IGNORED_KEYS } from "./config.js";
import { createFullPath } from "@/emitter/utils.js";
import type { BeeAgent } from "@/agents/bee/agent.js";
import { Serializable } from "@/internals/serializable.js";
import { instrumentationLogger } from "./logger.js";

export function createTelemetryMiddleware() {
  return (context: GetRunContext<RunInstance, unknown>) => {
    if (!context.emitter?.trace?.id) {
      throw new FrameworkError(`Fatal error. Missing traceId`);
    }

    const traceId = context.emitter?.trace?.id;
    if (activeTracesMap.has(traceId)) {
      return;
    }
    activeTracesMap.set(traceId, context.instance.constructor.name);

    instrumentationLogger.debug(
      {
        source: context.instance.constructor.name,
        traceId: traceId,
      },
      "createTelemetryMiddleware",
    );
    const { emitter, runParams, instance } = context;
    const basePath = createFullPath(emitter.namespace, "");

    let prompt: string | undefined | null = null;
    if (instance.constructor.name === "BeeAgent") {
      prompt = (runParams as Parameters<BeeAgent["run"]>)[0].prompt;
    }

    const spansMap = new Map<string, FrameworkSpan>();
    const parentIdsMap = new Map<string, number>();
    const spansToDeleteMap = new Map<string, undefined>();

    let generatedMessage: GeneratedResponse | undefined = undefined;
    let history: GeneratedResponse[] | undefined = undefined;
    const groupIterations: string[] = [];

    const idNameManager = new IdNameManager();

    const newTokenEventName: keyof GenerateCallbacks = `newToken`;
    const partialUpdateEventName: keyof BeeCallbacks = "partialUpdate";
    const successEventName: keyof GenerateCallbacks = `success`;
    const finishEventName: keyof GenerateCallbacks = `finish`;
    const startEventName: keyof GenerateCallbacks = `start`;
    const errorEventName: keyof GenerateCallbacks = `error`;

    const eventsIterationsMap = new Map<string, Map<string, string>>();

    const startTime = new Date();
    const serializer = traceSerializer({ ignored_keys: INSTRUMENTATION_IGNORED_KEYS });

    /**
     * delete all sources related to deleted span
     * @param param0
     * @returns
     */
    function cleanSpanSources({ spanId }: { spanId: string }) {
      const parentId = spansMap.get(spanId)?.parent_id;
      if (!parentId) {
        return;
      }

      const spanCount = parentIdsMap.get(parentId);
      if (!spanCount) {
        return;
      }

      if (spanCount > 1) {
        // increase the span count for the parentId
        parentIdsMap.set(parentId, spanCount - 1);
      } else if (spanCount === 1) {
        // delete the parentId from the map
        parentIdsMap.delete(parentId);
        // check the `spansToDelete` if the span should be deleted when it has no children's
        if (spansToDeleteMap.has(parentId)) {
          spansMap.delete(parentId);
          spansToDeleteMap.delete(parentId);
        }
      }
    }

    /**
     * Create OpenTelemetry spans from collected data
     */
    emitter.match(
      (event) => event.path === `${basePath}.run.${finishEventName}`,
      async (_, meta) => {
        try {
          instrumentationLogger.debug({ path: meta.path, traceId: traceId }, "run finish event");

          if (!prompt && instance.constructor.name === "BeeAgent") {
            prompt = (instance as BeeAgent).memory.messages
              .slice()
              .reverse()
              .find((message) => message.role === Role.USER)?.text;

            if (!prompt) {
              throw new FrameworkError("The prompt must be defined for the Agent's run");
            }
          }

          // create tracer spans from collected data
          buildTraceTree({
            prompt: prompt,
            history,
            generatedMessage,
            spans: JSON.parse(serializer(Array.from(spansMap.values()))),
            traceId,
            version: Version,
            runErrorSpanKey: `${basePath}.run.${errorEventName}`,
            startTime,
            endTime: new Date(),
            source: activeTracesMap.get(traceId)!,
          });
        } catch (e) {
          instrumentationLogger.warn(e, "Instrumentation error");
        } finally {
          activeTracesMap.delete(traceId);
        }
      },
    );

    /**
     * This block collects all "not run category" events with their data and prepares spans for the OpenTelemetry.
     * The huge number of `newToken` events are skipped and only the last one for each parent event is saved because of `generated_token_count` information
     * The framework event tree structure is different from the open-telemetry tree structure and must be transformed from groupId and parentGroupId pattern via idNameManager
     * The artificial "iteration" main tree level is computed from the `meta.groupId`
     */
    emitter.match("*.*", (data, meta) => {
      // allow `run.error` event due to the runtime error information
      if (meta.path.includes(".run.") && meta.path !== `${basePath}.run.${errorEventName}`) {
        return;
      }
      if (!meta.trace?.runId) {
        throw new FrameworkError(`Fatal error. Missing runId for event: ${meta.path}`);
      }

      /**
       * create groupId span level (id does not exist)
       * I use only the top-level groups like iterations other nested groups like tokens would introduce unuseful complexity
       */
      if (meta.groupId && !meta.trace.parentRunId && !groupIterations.includes(meta.groupId)) {
        spansMap.set(
          meta.groupId,
          createSpan({
            id: meta.groupId,
            name: meta.groupId,
            target: "groupId",
            startedAt: meta.createdAt,
          }),
        );
        groupIterations.push(meta.groupId);
      }

      const { spanId, parentSpanId } = idNameManager.getIds({
        path: meta.path,
        id: meta.id,
        runId: meta.trace.runId,
        parentRunId: meta.trace.parentRunId,
        groupId: meta.groupId,
      });

      const serializedData = getSerializedObjectSafe(data);

      // skip partialUpdate events with no data
      if (meta.name === partialUpdateEventName && isEmpty(serializedData)) {
        return;
      }

      const span = createSpan({
        id: spanId,
        name: meta.name,
        target: meta.path,
        ...(parentSpanId && { parent: { id: parentSpanId } }),
        ctx: getSerializedObjectSafe(meta.context),
        data: serializedData,
        error: getErrorSafe(data),
        startedAt: meta.createdAt,
      });

      const lastIteration = groupIterations[groupIterations.length - 1];

      // delete the `newToken` event if exists and create the new one
      const lastIterationOnNewTokenSpanId = eventsIterationsMap.get(lastIteration)?.get(meta.name);
      if (lastIterationOnNewTokenSpanId && meta.name === newTokenEventName) {
        // delete span
        cleanSpanSources({ spanId: lastIterationOnNewTokenSpanId });
        spansMap.delete(lastIterationOnNewTokenSpanId);
      }

      // delete the last `partialUpdate` event if the new one has same data and the original one does not have nested spans
      const lastIterationEventSpanId = eventsIterationsMap.get(lastIteration)?.get(meta.name);
      if (
        lastIterationEventSpanId &&
        ([partialUpdateEventName] as string[]).includes(meta.name) &&
        spansMap.has(lastIterationEventSpanId)
      ) {
        const { attributes, context } = spansMap.get(lastIterationEventSpanId)!;

        if (isDeepEqual(serializedData, attributes.data)) {
          if (parentIdsMap.has(context.span_id)) {
            spansToDeleteMap.set(lastIterationEventSpanId, undefined);
          } else {
            // delete span
            cleanSpanSources({ spanId: lastIterationEventSpanId });
            spansMap.delete(lastIterationEventSpanId);
          }
        }
      }

      // create new span
      spansMap.set(span.context.span_id, span);
      // update number of nested spans for parent_id if exists
      if (span.parent_id) {
        parentIdsMap.set(span.parent_id, (parentIdsMap.get(span.parent_id) || 0) + 1);
      }

      // save the last event for each iteration
      if (groupIterations.length > 0) {
        if (eventsIterationsMap.has(lastIteration)) {
          eventsIterationsMap.get(lastIteration)!.set(meta.name, span.context.span_id);
        } else {
          eventsIterationsMap.set(lastIteration, new Map().set(meta.name, span.context.span_id));
        }
      }
    });

    // The generated response and message history are collected from the `success` event
    emitter.on(
      successEventName as any,
      (data: InferCallbackValue<BeeCallbacks[typeof successEventName]>) => {
        if ("data" in data && "memory" in data) {
          const { data: dataObject, memory } = data as InferCallbackValue<
            BeeCallbacks[typeof successEventName]
          >;

          generatedMessage = {
            role: dataObject.role,
            text: dataObject.text,
          };
          history = memory.messages.map((msg) => ({ text: msg.text, role: msg.role }));
        }
      },
    );

    // Read rawPrompt from llm input only for supported adapters and create the custom event with it
    emitter.match(
      (event) => "messagesToPrompt" in event.creator && event.name === startEventName,
      ({ input }: InferCallbackValue<GenerateCallbacks[typeof startEventName]>, meta) => {
        if (
          "messagesToPrompt" in meta.creator &&
          typeof meta.creator.messagesToPrompt === "function" &&
          meta.creator instanceof Serializable &&
          meta.trace
        ) {
          const rawPrompt = meta.creator.messagesToPrompt(input);
          // create a custom path to prevent event duplication
          const path = `${meta.path}.custom`;

          const { spanId, parentSpanId } = idNameManager.getIds({
            path,
            id: meta.id,
            runId: meta.trace.runId,
            parentRunId: meta.trace.parentRunId,
            groupId: meta.groupId,
          });

          spansMap.set(
            spanId,
            createSpan({
              id: spanId,
              name: `${meta.name}Custom`,
              target: path,
              startedAt: meta.createdAt,
              ...(parentSpanId && { parent: { id: parentSpanId } }),
              data: {
                rawPrompt,
                creator: meta.creator.createSnapshot(),
              },
            }),
          );
        }
      },
    );
  };
}
