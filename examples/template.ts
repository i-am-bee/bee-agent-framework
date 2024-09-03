import "./helpers/setup.js";
import { PromptTemplate } from "bee-agent-framework/template";
import { Logger } from "bee-agent-framework/logger/logger";

const logger = new Logger({ name: "template" });

// Primitives
{
  const greetTemplate = new PromptTemplate({
    template: `Hello {{name}}`,
    variables: ["name"],
  });

  const output = greetTemplate.render({
    name: "Alex",
  });
  logger.info(output); // "Hello Alex!"
}

// Arrays
{
  const template = new PromptTemplate({
    variables: ["colors"],
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
    variables: ["expected", "responses"],
    defaults: {
      expected: 5,
    },
  });
  const output = template.render({
    expected: PromptTemplate.defaultPlaceholder,
    responses: [{ duration: 3 }, { duration: 5 }, { duration: 6 }],
  });
  logger.info(output);
}

// Forking
{
  const original = new PromptTemplate({
    template: `You are a helpful assistant called {{name}}. You objective is to {{objective}}.`,
    variables: ["name", "objective"],
  });

  const modified = original.fork((oldConfig) => ({
    ...oldConfig,
    template: `${oldConfig.template} Your answers must be concise.`,
    defaults: {
      name: "Allan",
    },
  }));

  const output = modified.render({
    name: PromptTemplate.defaultPlaceholder,
    objective: "fulfill the user needs",
  });
  logger.info(output);
}
