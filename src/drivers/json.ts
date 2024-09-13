import { parseBrokenJson } from "@/internals/helpers/schema.js";
import { GenerateOptions } from "@/llms/base.js";
import { PromptTemplate } from "@/template.js";
import { BaseDriver } from "./base.js";
import { SchemaObject } from "ajv";
import { z } from "zod";

export class JsonDriver<
  TGenerateOptions extends GenerateOptions = GenerateOptions,
> extends BaseDriver<TGenerateOptions> {
  protected template = new PromptTemplate({
    schema: z.object({
      schema: z.string(),
    }),
    template: `You are a helpful assistant that generates only valid JSON adhering to the following JSON Schema.

\`\`\`
{{schema}}
\`\`\`

IMPORTANT: Every message must be a parsable JSON string without additional output.
`,
  });

  protected parseResponse(textResponse: string): unknown {
    return parseBrokenJson(textResponse);
  }

  protected schemaToString(schema: SchemaObject): string {
    return JSON.stringify(schema, null, 2);
  }

  protected guided(schema: SchemaObject) {
    return { json: schema } as const;
  }
}
