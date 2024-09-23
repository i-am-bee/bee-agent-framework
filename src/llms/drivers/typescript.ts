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

import { parseBrokenJson } from "@/internals/helpers/schema.js";
import { GenerateOptions } from "@/llms/base.js";
import { PromptTemplate } from "@/template.js";
import { BaseDriver } from "@/llms/drivers/base.js";
import * as jsonSchemaToTypescript from "json-schema-to-typescript";
import { SchemaObject } from "ajv";
import { z } from "zod";

export class TypescriptDriver<
  TGenerateOptions extends GenerateOptions = GenerateOptions,
> extends BaseDriver<TGenerateOptions> {
  protected template = new PromptTemplate({
    schema: z.object({
      schema: z.string(),
    }),
    template: `You are a helpful assistant that generates only valid JSON adhering to the following TypeScript type.

\`\`\`
{{schema}}
\`\`\`

IMPORTANT: Every message must be a parsable JSON string without additional output.
`,
  });

  static {
    this.register();
  }

  protected parseResponse(textResponse: string): unknown {
    return parseBrokenJson(textResponse);
  }

  protected async schemaToString(schema: SchemaObject): Promise<string> {
    return await jsonSchemaToTypescript.compile(schema, "Output");
  }

  protected guided(schema: SchemaObject) {
    return { json: schema } as const;
  }
}
