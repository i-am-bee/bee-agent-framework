import { parseBrokenJson } from "@/internals/helpers/schema.js";
import { GenerateOptions } from "@/llms/base.js";
import { PromptTemplate } from "@/template.js";
import { BaseDriver } from "./base.js";
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
