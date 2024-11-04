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
import { traceSerializer } from "./trace-serializer.js";

describe("trace serializer", () => {
  test("should return the same object", () => {
    const object = {
      id: "trace.id",
      runId: "run-1",
      path: "my-string-path",
    };

    const serializer = traceSerializer({});
    expect(JSON.parse(serializer(object))).toEqual(object);
  });

  test("should remove default ignored keys", () => {
    const object = {
      id: "trace.id",
      runId: "run-1",
      path: "my-string-path",
      emitter: {
        // should be removed
        emit: () => {},
      },
      meta: {
        traceId: "abcd",
        tokens: ["my-secret-token"], // should be removed
        createdBy: {
          // should be removed
          id: 5,
        },
      },
      logger: {
        // should be removed
        log: () => "test",
      },
      _privateBoolean: true, // should be removed
      createdBy: {
        // should be removed
        id: 5,
      },
      client: {
        // should be removed
        name: "temp",
      },
      _privateNumber: 335, // should be removed,
    };

    const serializer = traceSerializer({});
    expect(JSON.parse(serializer(object))).deep.equals({
      id: "trace.id",
      runId: "run-1",
      path: "my-string-path",
      meta: {
        traceId: "abcd",
      },
    });
  });

  test('should remove "runId" and "path" custom defined keys', () => {
    const object = {
      id: "trace.id",
      runId: "run-1",
      path: "my-string-path",
    };

    const serializer = traceSerializer({ ignored_keys: ["runId", "path"] });
    expect(JSON.parse(serializer(object))).toEqual({ id: "trace.id" });
  });

  test("should remove both default and custom keys", () => {
    const object = {
      id: "trace.id",
      runId: "run-1",
      // next keys will be removed
      path: "my-string-path",
      logger: {
        log: () => "test",
      },
      _privateBoolean: true,
    };

    const serializer = traceSerializer({ ignored_keys: ["path"] });
    expect(JSON.parse(serializer(object))).toEqual({
      id: "trace.id",
      runId: "run-1",
    });
  });

  test("should remove keys in each object in Array", () => {
    const spans = [
      {
        id: "trace.id",
        runId: "run-1",
        path: "my-string-path",
        emitter: {
          // should be removed
          emit: () => {},
        },
      },
      {
        id: "trace.id",
        runId: "run-1",
        path: "my-string-path",
        _privateBoolean: true, // should be removed
        data: {
          prompt: "super prompt",
          special: {
            modelId: "eq-12",
            createdBy: {
              // should be removed
              id: 5,
            },
          },
        },
      },
    ];
    const serializer = traceSerializer({});
    expect(JSON.parse(serializer(spans))).toEqual([
      {
        id: "trace.id",
        runId: "run-1",
        path: "my-string-path",
      },
      {
        id: "trace.id",
        runId: "run-1",
        path: "my-string-path",
        data: {
          prompt: "super prompt",
          special: {
            modelId: "eq-12",
          },
        },
      },
    ]);
  });
});
