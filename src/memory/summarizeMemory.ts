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
import { BaseMemory } from "@/memory/base.js";
import { PromptTemplate } from "@/template.js";
import { shallowCopy } from "@/serializer/utils.js";
import { z } from "zod";
import { ChatLLM, ChatLLMOutput } from "@/llms/chat.js";

export interface SummarizeMemoryInput {
  llm: ChatLLM<ChatLLMOutput>;
  template?: typeof SummarizeMemoryTemplate;
}

export const SummarizeMemoryTemplate = new PromptTemplate({
  schema: z.object({
    summary: z.string(),
  }),
  template: `Progressively summarize the lines of conversation provided, adding onto the previous summary returning a new summary.

Current summary:
{{summary}}`,
});

export class SummarizeMemory extends BaseMemory {
  protected summary = "";
  protected template;
  protected llm;

  constructor(config: SummarizeMemoryInput) {
    super();
    this.template = config.template ?? SummarizeMemoryTemplate;
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
        role: Role.ASSISTANT,
        text: currentSummary,
      }),
    ];
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  async delete(message: BaseMessage) {
    return false;
  }

  async add(message: BaseMessage, _index?: number) {
    const response = await this.llm.generate([
      BaseMessage.of({
        role: Role.SYSTEM,
        text: this.template.render({
          summary: this.summary,
        }),
      }),
      BaseMessage.of({
        role: Role.ASSISTANT,
        text: `New lines of conversation:
${message.role}: ${message.text}

New summary:
`,
      }),
    ]);
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
