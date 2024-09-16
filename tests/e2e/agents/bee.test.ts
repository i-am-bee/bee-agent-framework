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

import { DuckDuckGoSearchTool } from "@/tools/search/duckDuckGoSearch.js";
import { FrameworkError } from "@/errors.js";
import { beforeEach, expect, vi } from "vitest";
import { Logger } from "@/logger/logger.js";
import { BeeAgent } from "@/agents/bee/agent.js";
import { UnconstrainedMemory } from "@/memory/unconstrainedMemory.js";
import { BaseMessage } from "@/llms/primitives/message.js";
import { createCallbackRegister } from "@tests/e2e/utils.js";
import { omitEmptyValues } from "@/internals/helpers/object.js";
import * as process from "node:process";
import { createChatLLM } from "@tests/utils/llmFactory.js";
import { BeeMeta } from "@/agents/bee/types.js";
import { UnconstrainedCache } from "@/cache/unconstrainedCache.js";

describe("Bee Agent", () => {
  const createAgent = () => {
    return new BeeAgent({
      llm: createChatLLM(),
      memory: new UnconstrainedMemory(),
      tools: [
        new DuckDuckGoSearchTool({
          cache: new UnconstrainedCache(),
          maxResultsPerPage: 10,
          throttle: {
            interval: 5000,
            limit: 1,
            strict: true,
          },
          httpClientOptions: {
            proxy: process.env.PROXY,
          },
        }),
      ],
    });
  };

  beforeEach(() => {
    vi.useRealTimers();
  });

  it("Aborts", async () => {
    const abortController = new AbortController();
    const myError = new Error("Stop!");
    setTimeout(() => {
      abortController.abort(myError);
    }, 500);

    const agent = createAgent();
    try {
      await agent.run(
        {
          prompt: 'What"s the biggest building on the world?"',
        },
        {
          signal: abortController.signal,
          execution: {
            maxIterations: 10,
            totalMaxRetries: 0,
            maxRetriesPerStep: 0,
          },
        },
      );
    } catch (e) {
      expect(e).toBeInstanceOf(FrameworkError);
      expect(e.getCause()).toBe(myError);
    }
  });

  it("Runs", async () => {
    const callbacks = createCallbackRegister();
    const userLogger = Logger.of({ name: "user" });
    const agent = createAgent();

    let response: Awaited<ReturnType<typeof agent.run>>;
    try {
      response = await agent
        .run(
          { prompt: "Who is the president of Czech Republic?" },
          {
            execution: {
              maxIterations: 5,
              totalMaxRetries: 5,
            },
          },
        )
        .observe((emitter) => {
          let lastIteration = 0;
          emitter.match("*", (data: { meta: BeeMeta }) => {
            expect(data.meta.iteration >= lastIteration);
            lastIteration = data.meta.iteration;
          });
          emitter.registerCallbacks({
            success: callbacks.create("success", {
              check: ({ data }) => {
                expect(data).toBeInstanceOf(BaseMessage);
                expect(Object.keys(omitEmptyValues(data)).length).toBeGreaterThan(0);
              },
            }),
            retry: callbacks.create("retry", { required: false }),
            error: callbacks.create("error", { required: false }),
            start: callbacks.create("start"),
            update: callbacks.create("update"),
            toolStart: callbacks.create("toolStart"),
            toolSuccess: callbacks.create("toolSuccess"),
            toolError: callbacks.create("toolError", { required: false }),
          });
        });
    } catch (e) {
      expect(e).toBeInstanceOf(FrameworkError);
      throw e;
    } finally {
      agent.destroy();
    }

    userLogger.info("==================END=====================");
    expect(response.result).toBeDefined();
    expect(response.result.text).toMatch(/petr pavel/i);

    callbacks.verify(({ fn }) => {
      for (const [_, event, ...extra] of fn.mock.calls) {
        expect(event).toBeDefined();
        expect(extra).toHaveLength(0);
      }
    });
  });
});
