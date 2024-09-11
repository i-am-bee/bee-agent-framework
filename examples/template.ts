import "./helpers/setup.js";
import { PromptTemplate } from "bee-agent-framework/template";
import { Logger } from "bee-agent-framework/logger/logger";
import { z } from "zod";

const logger = new Logger({ name: "template" });

// Primitives
{
  const greetTemplate = new PromptTemplate({
    template: `Hello {{name}}`,
    schema: z.object({
      name: z.string(),
    }),
  });

  const output = greetTemplate.render({
    name: "Alex",
  });
  logger.info(output); // "Hello Alex!"
}

// Arrays
{
  const template = new PromptTemplate({
    schema: z.object({
      colors: z.any(z.string()),
    }),
    template: `My Favorite Colors: {{#colors}}{{.}} {{/colors}}`,
  });
  const output = template.render({
    colors: ["Green", "Yellow"],
  });
  logger.info(output);
}

// Objects
{
  const template = new PromptTemplate({
    template: `Expected Duration: {{expected}}ms; Retrieved: {{#responses}}{{duration}}ms {{/responses}}`,
    schema: z.object({
      expected: z.number().default(5),
      responses: z.array(z.object({ duration: z.number() })),
    }),
  });
  const output = template.render({
    expected: undefined,
    responses: [{ duration: 3 }, { duration: 5 }, { duration: 6 }],
  });
  logger.info(output);
}

// Forking
{
  const original = new PromptTemplate({
    template: `You are a helpful assistant called {{name}}. You objective is to {{objective}}.`,
    schema: z.object({
      name: z.string(),
      objective: z.string(),
    }),
  });

  const modified = original.fork((oldConfig) => ({
    ...oldConfig,
    template: `${oldConfig.template} Your answers must be concise.`,
    defaults: {
      name: "Alex",
    },
  }));

  const output = modified.render({
    name: undefined,
    objective: "fulfill the user needs",
  });
  logger.info(output);
}
