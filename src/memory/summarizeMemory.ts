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

import { BaseMessage } from "@/llms/primitives/message.js";
import { BaseMemory } from "@/memory/base.js";
import { PromptTemplate } from "@/template.js";
import { LLM } from "@/llms/llm.js";
import { BaseLLMOutput } from "@/llms/base.js";
import { shallowCopy } from "@/serializer/utils.js";
import { z } from "zod";

export interface SummarizeMemoryInput {
  llm: LLM<BaseLLMOutput>;
  template: typeof SummarizeMemoryTemplate;
}

export const SummarizeMemoryTemplate = new PromptTemplate({
  schema: z.object({
    summary: z.string(),
    new_lines: z.string(),
  }),
  template: `Progressively summarize the lines of conversation provided, adding onto the previous summary returning a new summary.

EXAMPLE
Current summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good.

New lines of conversation:
Human: Why do you think artificial intelligence is a force for good?
AI: Because artificial intelligence will help humans reach their full potential.

New summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good because it will help humans reach their full potential.
END OF EXAMPLE

Current summary:
{{summary}}

New lines of conversation:
{{new_lines}}

New summary:`,
});

export class SummarizeMemory extends BaseMemory {
  protected summary = "";
  protected template;
  protected llm;

  constructor(config: SummarizeMemoryInput) {
    super();
    this.template = config.template;
    this.llm = config.llm;
  }

  static {
    this.register();
  }

  get messages(): BaseMessage[] {
    const currentSummary = this.summary;
    if (!currentSummary) {
      return [];
    }

    return [
      BaseMessage.of({
        role: "system",
        text: currentSummary,
      }),
    ];
  }

  async add(message: BaseMessage) {
    const prompt = this.template.render({
      summary: this.summary,
      new_lines: `${message.role}: ${message.text}`,
    });

    const response = await this.llm.generate(prompt);
    this.summary = response.getTextContent();
  }

  reset() {
    this.summary = "";
  }

  createSnapshot() {
    return {
      summary: this.summary,
      template: this.template,
      llm: this.llm,
      messages: shallowCopy(this.messages),
    };
  }

  loadSnapshot(state: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, state);
  }
}
