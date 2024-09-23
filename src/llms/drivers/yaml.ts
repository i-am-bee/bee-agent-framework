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

import { GenerateOptions } from "@/llms/base.js";
import { PromptTemplate } from "@/template.js";
import { BaseDriver } from "@/llms/drivers/base.js";
import yaml from "js-yaml";
import { SchemaObject } from "ajv";
import { z } from "zod";

export class YamlDriver<
  TGenerateOptions extends GenerateOptions = GenerateOptions,
> extends BaseDriver<TGenerateOptions> {
  protected template = new PromptTemplate({
    schema: z.object({
      schema: z.string(),
    }),
    template: `You are a helpful assistant that generates only valid YAML adhering to the following schema.

\`\`\`
{{schema}}
\`\`\`

IMPORTANT: Every message must be a parsable YAML string without additional output.
`,
  });

  static {
    this.register();
  }

  protected parseResponse(textResponse: string): unknown {
    return yaml.load(textResponse);
  }

  protected schemaToString(schema: SchemaObject): string {
    return yaml.dump(schema);
  }
}
