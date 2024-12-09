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

import { createSchemaValidator, toJsonSchema } from "@/internals/helpers/schema.js";
import { GenerateOptions, LLMError } from "@/llms/base.js";
import { ChatLLM, ChatLLMOutput } from "@/llms/chat.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { Retryable } from "@/internals/helpers/retryable.js";
import { PromptTemplate } from "@/template.js";
import { SchemaObject } from "ajv";
import { TypeOf, z, ZodTypeAny } from "zod";
import { Serializable } from "@/internals/serializable.js";

export interface GenerateSchemaInput<T> {
  maxRetries?: number;
  options?: T;
}

export interface DriverResponse<T> {
  raw: ChatLLMOutput;
  parsed: T extends ZodTypeAny ? TypeOf<T> : T;
  messages: BaseMessage[];
}

export abstract class BaseDriver<
  TGenerateOptions extends GenerateOptions = GenerateOptions,
> extends Serializable<any> {
  protected abstract template: PromptTemplate.infer<{ schema: string }>;
  protected errorTemplate = new PromptTemplate({
    schema: z.object({
      errors: z.string(),
      expected: z.string(),
      received: z.string(),
    }),
    template: `Generated response does not match the expected schema!
Validation Errors: "{{errors}}"`,
  });

  constructor(protected readonly llm: ChatLLM<ChatLLMOutput, TGenerateOptions>) {
    super();
  }

  protected abstract parseResponse(textResponse: string): unknown;
  protected abstract schemaToString(schema: SchemaObject): Promise<string> | string;

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected guided(schema: SchemaObject): GenerateOptions["guided"] | undefined {
    return undefined;
  }

  async generate<T = any>(
    schema: T extends ZodTypeAny ? T : SchemaObject,
    input: BaseMessage[],
    { maxRetries = 3, options }: GenerateSchemaInput<TGenerateOptions> = {},
  ): Promise<DriverResponse<T>> {
    const jsonSchema = toJsonSchema(schema);
    const validator = createSchemaValidator(jsonSchema);
    const schemaString = await this.schemaToString(jsonSchema);

    const messages: BaseMessage[] = [
      BaseMessage.of({
        role: Role.SYSTEM,
        text: this.template.render({ schema: schemaString }),
      }),
      ...input,
    ];

    return new Retryable({
      executor: async () => {
        const raw = await this.llm.generate(messages, {
          guided: this.guided(jsonSchema),
          ...options,
        } as TGenerateOptions);
        const textResponse = raw.getTextContent();
        let parsed: any;

        try {
          parsed = this.parseResponse(textResponse);
        } catch (error) {
          throw new LLMError(`Failed to parse the generated response.`, [], {
            isFatal: false,
            isRetryable: true,
            context: { error: (error as Error).message, received: textResponse },
          });
        }

        const success = validator(parsed);
        if (!success) {
          const context = {
            expected: schemaString,
            received: textResponse,
            errors: JSON.stringify(validator.errors ?? []),
          };

          messages.push(
            BaseMessage.of({
              role: Role.USER,
              text: this.errorTemplate.render(context),
            }),
          );
          throw new LLMError(
            "Failed to generate a structured response adhering to the provided schema.",
            [],
            {
              isFatal: false,
              isRetryable: true,
              context,
            },
          );
        }
        return {
          raw: raw,
          parsed: parsed,
          messages,
        };
      },
      config: {
        signal: options?.signal,
        maxRetries,
      },
    }).get();
  }

  createSnapshot() {
    return {
      template: this.template,
      errorTemplate: this.errorTemplate,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
