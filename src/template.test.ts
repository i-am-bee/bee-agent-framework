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

import { PromptTemplateError, PromptTemplate, ValidationPromptTemplateError } from "@/template.js";

describe("Prompt Template", () => {
  describe("Rendering", () => {
    it.each([1, "1", true, false, "Hey!"])("Handles primitives (%s)", (value) => {
      const template = new PromptTemplate({
        variables: ["value"],
        template: `Input: {{value}}!`,
      });

      expect(template.render({ value })).toStrictEqual(`Input: ${value}!`);
    });

    it.each([[[]], [[1, 2, 3]], [["a", "b", "c"]]])("Handles arrays (%s)", (values) => {
      const template = new PromptTemplate({
        variables: ["values"],
        template: `Input: {{#values}}{{.}}{{/values}}`,
      });

      expect(template.render({ values })).toStrictEqual(`Input: ${values.join("")}`);
    });

    it.each([[[{ name: "Tomas" }, { name: "Lukas" }, { name: "Alex" }]], [[]], [[{}]]])(
      "Handles plain objects (%s)",
      (values) => {
        const template = new PromptTemplate({
          variables: ["values"],
          template: `{{#values}}Name: {{name}}\n{{/values}}`,
        });

        expect(template.render({ values })).toMatch(
          values.map((value: any) => `Name: ${value?.name ?? ""}\n`).join(""),
        );
      },
    );

    it("Handles multiple occurrences of same variable", () => {
      const template = new PromptTemplate({
        variables: ["firstName", "lastName"],
        template: `First Name: {{firstName}}. Last Name {{lastName}}. Full Name: {{firstName}} {{lastName}}.`,
      });
      expect(template.render({ firstName: "A", lastName: "B" })).toMatchInlineSnapshot(
        `"First Name: A. Last Name B. Full Name: A B."`,
      );
    });

    it("Uses the value from defaults", () => {
      const template = new PromptTemplate({
        variables: ["name"],
        template: `{{name}}`,
        defaults: {
          name: "Alex",
        },
      });
      expect(
        template.render({
          name: PromptTemplate.defaultPlaceholder,
        }),
      ).toStrictEqual("Alex");
    });
  });

  describe("Validation", () => {
    it.each([null, undefined])("Validates required variables (%s)", (value) => {
      const template = new PromptTemplate({
        variables: ["value"],
        template: `Input: {{value}}!`,
      });

      expect(() => template.render({ value })).toThrowError(PromptTemplateError);
    });

    it.each([null, undefined])("Validates only required variables (%s)", (value) => {
      const template = new PromptTemplate({
        variables: ["value"],
        optionals: ["value"],
        template: `Input: {{value}}!`,
      });

      expect(template.render({ value })).toBeTruthy();
    });

    it.each([
      {
        variables: ["name"],
        template: `Name: {{name}}; Age: {{age}}`,
      },
      {
        variables: ["name"],
        optionals: ["age"],
        template: `Name: {{name}}; Age: {{age}}`,
      },
      {
        variables: [],
        template: `{{#values}}{{.}}{{/values}}`,
      },
    ])("Throws when variable is not explicitly mentioned", ({ variables, optionals, template }) => {
      expect(
        () =>
          new PromptTemplate({
            variables,
            optionals,
            template,
          }),
      ).toThrowError(PromptTemplateError);
    });

    it.each([
      [
        {
          template: `{{#value}}{{.}}{{/value}}`,
          values: [true, false, {}, new Map(), new Set(), "", 1, false],
        },
      ],
      [
        {
          template: `{{value}}`,
          values: [{}, [], new Map(), new Set()],
        },
      ],
      [
        {
          template: `{{value}}`,
          values: [() => ({})],
        },
      ],
    ])("Throws wrong data-type is passed (%s)", ({ template: templateRaw, values }) => {
      const template = new PromptTemplate({
        variables: ["value"],
        template: templateRaw,
      });

      for (const value of values) {
        expect(() => template.render({ value })).toThrowError(ValidationPromptTemplateError);
      }
    });
  });

  describe("Customization", () => {
    const createTemplate = () => {
      return new PromptTemplate({
        template: `Hello <<name>>!`,
        variables: ["name"],
        optionals: [],
        customTags: ["<<", ">>"],
        escape: false,
        defaults: {},
      });
    };

    it("Clones", () => {
      const template = createTemplate();
      const cloned = template.clone();
      expect(cloned).toEqual(template);
    });

    it("Forks", () => {
      const template = new PromptTemplate({
        template: `Hello <<name>>!`,
        variables: ["name"],
        optionals: [],
        customTags: ["<<", ">>"],
        escape: false,
        defaults: {},
      });
      const forked = template.fork((config) => ({
        ...config,
        template: "Hello {{name}}!",
        customTags: ["{{", "}}"],
      }));

      expect(template.render({ name: "Tomas" })).toEqual(forked.render({ name: "Tomas" }));
    });
  });
});
