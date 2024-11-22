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

import { DefaultRunner } from "@/agents/bee/runners/default/runner.js";
import { UnconstrainedMemory } from "@/memory/unconstrainedMemory.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { BaseMemory } from "@/memory/base.js";
import { BeeUserPrompt } from "@/agents/bee/prompts.js";
import { zip } from "remeda";
import { RunContext } from "@/context.js";
import { BeeAgent } from "@/agents/bee/agent.js";

vi.mock("@/memory/tokenMemory.js", async () => {
  const { UnconstrainedMemory } = await import("@/memory/unconstrainedMemory.js");
  class TokenMemory extends UnconstrainedMemory {}
  return { TokenMemory };
});

vi.mock("@/context.js");

describe("Bee Agent Runner", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("Handles different prompt input source", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-09-10T19:51:46.954Z"));

    const createMemory = async () => {
      const memory = new UnconstrainedMemory();
      await memory.addMany([
        BaseMessage.of({
          role: Role.USER,
          text: "What is your name?",
        }),
        BaseMessage.of({
          role: Role.ASSISTANT,
          text: "I am Bee",
        }),
      ]);
      return memory;
    };

    const createInstance = async (memory: BaseMemory, prompt: string | null) => {
      const instance = new DefaultRunner(
        {
          llm: expect.any(Function),
          memory,
          tools: [],
          templates: {},
        },
        {},
        new RunContext<BeeAgent, any>({} as any, {} as any),
      );
      await instance.init({ prompt });
      return instance;
    };

    const memory = await createMemory();
    const prompt = "What can you do for me?";
    const instance = await createInstance(memory, prompt);

    const memory2 = await createMemory();
    await memory2.add(
      BaseMessage.of({ role: Role.USER, text: prompt, meta: { createdAt: new Date() } }),
    );
    const instance2 = await createInstance(memory2, null);
    expect(instance.memory.messages).toEqual(instance2.memory.messages);
  });

  it.each([
    BeeUserPrompt.fork((old) => ({
      ...old,
      functions: { ...old.functions, formatMeta: () => "" },
    })),
    BeeUserPrompt.fork((old) => ({ ...old, template: `{{input}}` })),
    BeeUserPrompt.fork((old) => ({ ...old, template: `User: {{input}}` })),
    BeeUserPrompt.fork((old) => ({ ...old, template: `` })),
  ])("Correctly formats user input", async (template: typeof BeeUserPrompt) => {
    const memory = new UnconstrainedMemory();
    await memory.addMany([
      BaseMessage.of({
        role: Role.USER,
        text: "What is your name?",
      }),
      BaseMessage.of({
        role: Role.ASSISTANT,
        text: "Bee",
      }),
      BaseMessage.of({
        role: Role.USER,
        text: "Who are you?",
      }),
      BaseMessage.of({
        role: Role.ASSISTANT,
        text: "I am a helpful assistant.",
      }),
    ]);

    const prompt = "What can you do for me?";
    const instance = new DefaultRunner(
      {
        llm: expect.any(Function),
        memory,
        tools: [],
        templates: {
          user: template,
        },
      },
      {},
      new RunContext<BeeAgent, any>({} as any, {} as any),
    );
    await instance.init({ prompt });

    for (const [a, b] of zip(
      [
        ...memory.messages.filter((msg) => msg.role === Role.USER),
        BaseMessage.of({ role: Role.USER, text: prompt }),
      ],
      instance.memory.messages.filter((msg) => msg.role === Role.USER),
    )) {
      expect(template.render({ input: a.text, meta: undefined })).toStrictEqual(b.text);
    }
  });
});
