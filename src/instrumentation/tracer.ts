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

import { Version } from "@/version.js";
import opentelemetry, { SpanStatusCode, TimeInput } from "@opentelemetry/api";
import { FrameworkSpan, GeneratedResponse } from "./types.js";

export const tracer = opentelemetry.trace.getTracer("bee-agent-framework", Version);

export const activeTracesMap = new Map<string, string>();

interface ComputeTreeProps {
  prompt?: string | null;
  history: GeneratedResponse[] | undefined;
  generatedMessage: GeneratedResponse | undefined;
  spans: FrameworkSpan[];
  traceId: string;
  version: string;
  runErrorSpanKey: string;
  startTime: TimeInput;
  endTime: TimeInput;
  source: string;
}

interface BuildSpansForParentProps {
  spans: FrameworkSpan[];
  parentId: string | undefined;
}

function buildSpansForParent({ spans, parentId }: BuildSpansForParentProps) {
  spans
    .filter((fwSpan) => fwSpan.parent_id === parentId)
    .forEach((fwSpan) => {
      tracer.startActiveSpan(
        fwSpan.context.span_id,
        {
          // custom start time
          startTime: fwSpan.start_time,
          // set span important attributes
          attributes: {
            target: fwSpan.attributes.target,
            name: fwSpan.name,
            ...(fwSpan.attributes.data && { data: JSON.stringify(fwSpan.attributes.data) }),
            ...(fwSpan.attributes.ctx && { ctx: JSON.stringify(fwSpan.attributes.ctx) }),
          },
        },
        (activeSpan) => {
          // set status
          activeSpan.setStatus(fwSpan.status);

          // set nested spans
          buildSpansForParent({ spans, parentId: fwSpan.context.span_id });

          // finish the span
          activeSpan.end(fwSpan.end_time);
        },
      );
    });
}

export function buildTraceTree({
  prompt,
  history,
  generatedMessage,
  spans,
  traceId,
  version,
  runErrorSpanKey,
  startTime,
  endTime,
  source,
}: ComputeTreeProps) {
  tracer.startActiveSpan(
    `bee-agent-framework-${source}-${traceId}`,
    {
      // custom start time
      startTime,
      // set main span important attributes
      attributes: {
        traceId,
        version,
        ...(prompt && { prompt }),
        ...(generatedMessage !== undefined && { response: JSON.stringify(generatedMessage) }),
        ...(history && { history: JSON.stringify(history) }),
      },
    },
    (activeSpan) => {
      // set status
      const runErrorSpan = spans.find((span) => span.attributes.target === runErrorSpanKey);
      if (runErrorSpan) {
        activeSpan.setStatus(runErrorSpan.status);
      } else {
        activeSpan.setStatus({ code: SpanStatusCode.OK });
      }

      // set nested spans
      buildSpansForParent({ spans, parentId: undefined });

      // finish the main span with custom end time
      activeSpan.end(endTime);
    },
  );
}
