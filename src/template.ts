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

import { FrameworkError } from "@/errors.js";
import { ObjectLike, PlainObject } from "@/internals/types.js";
import * as R from "remeda";
import Mustache from "mustache";
import { Serializable } from "@/internals/serializable.js";
import { z, ZodType } from "zod";
import { createSchemaValidator, toJsonSchema } from "@/internals/helpers/schema.js";
import type { SchemaObject, ValidateFunction } from "ajv";
import { shallowCopy } from "@/serializer/utils.js";
import { pickBy } from "remeda";
import { getProp } from "@/internals/helpers/object.js";

type PostInfer<T> = T extends PlainObject
  ? {
      [K in keyof T]: T[K] extends Date ? string : T[K];
    }
  : T;
type InferValue<T> = T extends ZodType<infer A> ? PostInfer<A> : never;
export type PromptTemplateRenderFn<K extends ZodType> = (this: InferValue<K>) => any;

export type PromptTemplateRenderInput<T extends ZodType, T2 extends z.input<T> = z.input<T>> = {
  [K in Extract<keyof T2, string>]: T2[K] | PromptTemplateRenderFn<T> | undefined;
};

export interface PromptTemplateInput<T extends ZodType> {
  template: string;
  customTags?: [string, string];
  escape?: boolean;
  schema: SchemaObject;
  defaults?: Partial<InferValue<T>>;
  functions?: Record<string, PromptTemplateRenderFn<T>>;
}

type PromptTemplateConstructor<T extends ZodType, N> = N extends ZodType
  ? Omit<PromptTemplateInput<N>, "schema" | "functions" | "defaults"> & {
      schema: N;
      functions?: Record<string, PromptTemplateRenderFn<N | T>>;
      defaults?: Partial<InferValue<N | T>>;
    }
  : Omit<PromptTemplateInput<T>, "schema"> & { schema: T | SchemaObject };

type Customizer<T extends ZodType, N> = (
  config: Required<PromptTemplateInput<T>>,
) => PromptTemplateConstructor<T, N>;

export class PromptTemplateError<T extends ZodType> extends FrameworkError {
  template: PromptTemplate<T>;

  constructor(message: string, template: PromptTemplate<T>, context?: ObjectLike) {
    super(message, [], {
      context,
    });
    this.template = template;
  }
}

export class ValidationPromptTemplateError<T extends ZodType> extends PromptTemplateError<T> {}

export class PromptTemplate<T extends ZodType> extends Serializable {
  protected config: Required<PromptTemplateInput<T>>;

  public static functions = {
    trim: () => (text: string, render: (value: string) => string) => {
      return render(text).replace(/(,\s*$)/g, "");
    },
  };

  constructor(config: Omit<PromptTemplateInput<T>, "schema"> & { schema: T | SchemaObject }) {
    super();
    this.config = {
      ...config,
      defaults: (config.defaults ?? {}) as Partial<InferValue<T>>,
      schema: toJsonSchema(config.schema),
      escape: Boolean(config.escape),
      customTags: config.customTags ?? ["{{", "}}"],
      functions: {
        ...PromptTemplate.functions,
        ...config.functions,
      },
    };
  }

  static {
    this.register();
  }

  validateInput(input: unknown): asserts input is T {
    const validator = createSchemaValidator(this.config.schema, {
      coerceTypes: false,
    }) as ValidateFunction<T>;

    const success = validator(input);
    if (!success) {
      throw new ValidationPromptTemplateError(
        `Template cannot be rendered because input does not adhere to the template schema.`,
        this,
        {
          errors: validator.errors,
        },
      );
    }
  }

  fork(customizer: Customizer<T, SchemaObject>): PromptTemplate<T>;
  fork<R extends ZodType>(customizer: Customizer<T, R>): PromptTemplate<R>;
  fork<R extends ZodType>(
    customizer: Customizer<T, SchemaObject> | Customizer<T, R>,
  ): PromptTemplate<T | R> {
    const config = shallowCopy(this.config);
    const newConfig = customizer?.(config) ?? config;
    return new PromptTemplate(newConfig);
  }

  render(input: PromptTemplateRenderInput<T>): string {
    const updatedInput: typeof input = { ...input };
    Object.assign(
      updatedInput,
      pickBy(this.config.defaults, (_, k) => getProp(updatedInput, [k]) === undefined),
    );

    this.validateInput(updatedInput);
    const view: Record<string, any> = {
      ...this.config.functions,
      ...updatedInput,
    };

    const output = Mustache.render(
      this.config.template,
      view,
      {},
      {
        tags: this.config.customTags,
        ...(!this.config.escape && {
          escape: R.identity(),
        }),
      },
    );

    if (output.match(/\[object (.+)]/)) {
      throw new ValidationPromptTemplateError(
        "Rendered template contains incorrectly serialized value!",
        this,
        {
          output,
        },
      );
    }

    return output;
  }

  loadSnapshot(data: ReturnType<typeof this.createSnapshot>) {
    this.config = data.config;
  }

  createSnapshot() {
    return {
      config: this.config,
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PromptTemplate {
  export type infer<T> = PromptTemplate<ZodType<T>>;
}
