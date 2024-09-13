import { GenerateOptions } from "@/llms/base.js";
import { PromptTemplate } from "@/template.js";
import { BaseDriver } from "./base.js";
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

  protected parseResponse(textResponse: string): unknown {
    return yaml.load(textResponse);
  }

  protected schemaToString(schema: SchemaObject): string {
    return yaml.dump(schema);
  }
}
