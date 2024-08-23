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
import { ObjectLike } from "@/internals/types.js";
import * as R from "remeda";
import Mustache, { TemplateSpans } from "mustache";
import { Serializable } from "@/internals/serializable.js";
import { hasProp } from "@/internals/helpers/object.js";
import { shallowCopy } from "@/serializer/utils.js";

export type PromptTemplateRenderFn = () => any;
export type PromptTemplateValue = any | PromptTemplateRenderFn;
export type PromptTemplateRenderInput<K extends string> = Record<K, PromptTemplateValue>;

export interface PromptTemplateInput<K extends string> {
  template: string;
  customTags?: [string, string];
  escape?: boolean;
  variables: readonly K[];
  optionals?: readonly Partial<K>[];
  defaults?: Partial<PromptTemplateRenderInput<K>>;
}

export class PromptTemplateError<T extends string> extends FrameworkError {
  template: PromptTemplate<T>;

  constructor(message: string, template: PromptTemplate<T>, context?: ObjectLike) {
    super(message, [], {
      context,
    });
    this.template = template;
  }
}

export class ValidationPromptTemplateError<T extends string> extends PromptTemplateError<T> {}

type VariableType = "primitive" | "array" | "inverse";
const typeToVariableType: Record<string, VariableType> = {
  "#": "array",
  "^": "inverse",
};

interface ParsedTemplateSpans<K> {
  variables: Map<K, { type: VariableType }>;
  raw: TemplateSpans;
}

export class PromptTemplate<K extends string> extends Serializable {
  protected config: Required<PromptTemplateInput<K>>;
  protected parsed: ParsedTemplateSpans<K>;

  constructor(config: PromptTemplateInput<K>) {
    super();
    this.config = {
      ...config,
      escape: Boolean(config.escape),
      customTags: config.customTags ?? ["{{", "}}"],
      optionals: config.optionals ?? [],
      defaults: config.defaults ?? {},
    };
    this.parsed = this._parse();
  }

  static {
    this.register();
  }

  static readonly defaultPlaceholder = Symbol("default");

  protected _parse(): ParsedTemplateSpans<K> {
    const _raw = Mustache.parse(this.config.template, this.config.customTags);
    const result: ParsedTemplateSpans<K> = {
      raw: _raw,
      variables: new Map(),
    };

    const definedVariables = new Set<string>(this.config.variables);
    const seenVariables = new Set<string>();

    // eslint-disable-next-line prefer-const
    for (let [type, name] of _raw) {
      if (type === "text") {
        continue;
      }
      if (name.includes(".")) {
        name = name.substring(0, name.indexOf("."));
      }
      if (!definedVariables.has(name) && !seenVariables.has(name)) {
        throw new PromptTemplateError(
          `Variable "${name}" was found in template but not in initial definition!`,
          this,
        );
      }
      seenVariables.add(name);
      definedVariables.delete(name);

      result.variables.set(name as K, {
        type: typeToVariableType[type] ?? "primitive",
      });
    }

    return result;
  }

  fork(customizer?: (config: Required<PromptTemplateInput<K>>) => PromptTemplateInput<K>) {
    const config = R.clone(this.config);
    return new PromptTemplate<K>(customizer?.(config) ?? config);
  }

  render(inputs: PromptTemplateRenderInput<K>): string {
    const allowedKeys = Array.from(this.parsed.variables.keys());
    const rawView: Record<string, PromptTemplateValue> = R.merge(
      R.pick(this.config.defaults ?? {}, allowedKeys),
      R.pick(inputs, allowedKeys),
    );

    const view: Record<string, any> = {};
    for (const [key, { type }] of this.parsed.variables) {
      const isOptional = this.config.optionals.includes(key);

      let value = rawView[key];
      if (value === PromptTemplate.defaultPlaceholder) {
        if (!hasProp(this.config.defaults, key)) {
          throw new PromptTemplateError(`No default value exists for variable "${key}"`, this);
        }
        value = this.config.defaults?.[key];
      }

      if (!isOptional && R.isNullish(value)) {
        throw new PromptTemplateError(`Empty value has been passed for variable "${key}".`, this, {
          value,
          inputs,
        });
      }

      if (!R.isFunction(value)) {
        if (type === "array" && !R.isArray(value)) {
          throw new ValidationPromptTemplateError(
            `Invalid value provided for variable "${key}" (expected array)`,
            this,
          );
        } else if (type === "primitive" && R.isObjectType(value)) {
          throw new ValidationPromptTemplateError(
            `Invalid value provided for variable "${key}" (expected literal)`,
            this,
          );
        }
      }

      view[key] = value;
    }

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
    this.parsed = this._parse();
  }

  createSnapshot() {
    return {
      config: shallowCopy(this.config),
      parsed: this.parsed,
    };
  }
}
