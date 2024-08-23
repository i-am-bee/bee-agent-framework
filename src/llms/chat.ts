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

import { BaseLLM, BaseLLMOutput, GenerateOptions, LLMError } from "@/llms/base.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import {
  AnySchemaLike,
  createSchemaValidator,
  FromSchemaLike,
  parseBrokenJson,
  toJsonSchema,
} from "@/internals/helpers/schema.js";
import { Retryable } from "@/internals/helpers/retryable.js";
import { GeneratedStructuredErrorTemplate, GeneratedStructuredTemplate } from "@/llms/prompts.js";

export abstract class ChatLLMOutput extends BaseLLMOutput {
  abstract get messages(): readonly BaseMessage[];
}

export interface GenerateSchemaInput<T> {
  template?: typeof GeneratedStructuredTemplate;
  errorTemplate?: typeof GeneratedStructuredErrorTemplate;
  maxRetries?: number;
  options?: T;
}

export abstract class ChatLLM<
  TOutput extends ChatLLMOutput,
  TGenerateOptions extends GenerateOptions = GenerateOptions,
> extends BaseLLM<BaseMessage[], TOutput, TGenerateOptions> {
  async generateStructured<T extends AnySchemaLike>(
    schema: T,
    input: BaseMessage[],
    {
      template = GeneratedStructuredTemplate,
      errorTemplate = GeneratedStructuredErrorTemplate,
      maxRetries = 3,
      options,
    }: GenerateSchemaInput<TGenerateOptions> = {},
  ): Promise<FromSchemaLike<T>> {
    const jsonSchema = toJsonSchema(schema);
    const validator = createSchemaValidator(jsonSchema);

    const finalOptions = { ...options } as TGenerateOptions;
    if (!options?.guided) {
      finalOptions.guided = { json: jsonSchema };
    }

    const messages: BaseMessage[] = [
      BaseMessage.of({
        role: Role.SYSTEM,
        text: template.render({
          schema: JSON.stringify(jsonSchema, null, 2),
        }),
      }),
      ...input,
    ];

    return new Retryable({
      executor: async () => {
        const rawResponse = await this.generate(messages, finalOptions);
        const textResponse = rawResponse.getTextContent();
        const jsonResponse: any = parseBrokenJson(textResponse);

        const success = validator(jsonResponse);
        if (!success) {
          const context = {
            expected: JSON.stringify(jsonSchema),
            received: jsonResponse ? JSON.stringify(jsonResponse) : textResponse,
            errors: JSON.stringify(validator.errors ?? []),
          };

          messages.push(
            BaseMessage.of({
              role: Role.USER,
              text: errorTemplate.render(context),
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
        return jsonResponse as FromSchemaLike<T>;
      },
      config: {
        signal: options?.signal,
        maxRetries,
      },
    }).get();
  }
}
