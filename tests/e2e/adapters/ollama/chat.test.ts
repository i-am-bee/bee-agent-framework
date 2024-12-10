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

import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";
import { Ollama } from "ollama";
import { toJsonSchema } from "@/internals/helpers/schema.js";
import { z } from "zod";
import { Comparator, compareVersion } from "@/internals/helpers/string.js";

const host = process.env.OLLAMA_HOST;

describe.runIf(Boolean(host))("Ollama Chat LLM", () => {
  const createChatLLM = (maxTokens?: number) => {
    return new OllamaChatLLM({
      modelId: "llama3.1",
      parameters: {
        temperature: 0,
        num_predict: maxTokens,
      },
      client: new Ollama({
        host,
      }),
    });
  };

  it("Generates", async () => {
    const conversation = [
      BaseMessage.of({
        role: Role.SYSTEM,
        text: `You are a helpful and respectful and honest assistant. Your name is Bee.`,
      }),
    ];
    const llm = createChatLLM(5);
    const response = await llm.generate([
      ...conversation,
      BaseMessage.of({
        role: "user",
        text: "What is your name? Just output the name without any additional comment.",
      }),
    ]);
    expect(response.getTextContent()).includes("Bee");
  });

  it("Leverages structured output", async () => {
    const llm = createChatLLM();
    const version = await llm.version();

    if (compareVersion(version, Comparator.LT, "0.5.0")) {
      // eslint-disable-next-line no-console
      console.warn(`Structured output is not available in the current version (${version})`);
      return;
    }

    const response = await llm.generate(
      [
        BaseMessage.of({
          role: "user",
          text: "Generate a valid JSON object.",
        }),
      ],
      {
        stream: false,
        guided: {
          json: toJsonSchema(
            z
              .object({
                a: z.literal("a"),
                b: z.literal("b"),
                c: z.literal("c"),
              })
              .strict(),
          ),
        },
      },
    );
    expect(response.getTextContent()).toMatchInlineSnapshot(`"{"a": "a", "b": "b", "c": "c"}"`);
  });

  it("Retrieves version", async () => {
    const llm = createChatLLM();
    const version = await llm.version();
    expect(version).toBeDefined();
  });
});
