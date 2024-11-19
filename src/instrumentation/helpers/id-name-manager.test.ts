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

import { expect, test, describe } from "vitest";
import { IdNameManager } from "./id-name-manager.js";

describe("id name manager", () => {
  test("should pair events by run ID structure", () => {
    const idNameManager = new IdNameManager();

    // set 3 events for run level 1
    idNameManager.getIds({
      id: "event-1",
      path: "react.run.start",
      runId: "run-1",
    });
    idNameManager.getIds({
      id: "event-2",
      path: "react.run.something",
      runId: "run-1",
    });
    idNameManager.getIds({
      id: "event-3",
      path: "react.run.something",
      runId: "run-1",
    });

    // add event from nested run
    const { spanId, parentSpanId } = idNameManager.getIds({
      id: "event-nested-1",
      path: "ll.nested",
      runId: "run-2",
      parentRunId: "run-1",
    });

    expect(spanId).toBe("ll.nested-1");
    expect(parentSpanId).toBe("react.run.something-2");
  });

  test("should use groupId", () => {
    const idNameManager = new IdNameManager();

    // Top level events grouped by groupId
    expect(
      idNameManager.getIds({
        id: "event-1",
        path: "react.run.start",
        runId: "run-1",
        groupId: "iteration-1",
      }),
    ).toEqual({
      spanId: "react.run.start-1",
      parentSpanId: "iteration-1",
    });

    expect(
      idNameManager.getIds({
        id: "event-2",
        path: "react.run.something",
        runId: "run-1",
        groupId: "iteration-1",
      }),
    ).toEqual({
      spanId: "react.run.something-1",
      parentSpanId: "iteration-1",
    });

    // nested event with standard parentId
    expect(
      idNameManager.getIds({
        id: "tool-1",
        path: "react.tool.start",
        runId: "run-2",
        parentRunId: "run-1",
        groupId: "iteration-1",
      }),
    ).toEqual({
      spanId: "react.tool.start-1",
      parentSpanId: "react.run.something-1",
    });
  });
});
