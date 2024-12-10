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

import {
  BaseToolOptions,
  BaseToolRunOptions,
  ToolEmitter,
  JSONToolOutput,
  Tool,
  ToolEvents,
  ToolInput,
} from "@/tools/base.js";
import type { GetRunContext } from "@/context.js";
import type { RunnableConfig } from "@langchain/core/runnables";
import { AnyZodObject, ZodEffects } from "zod";
import * as LCTools from "@langchain/core/tools";
import { Serializer } from "@/serializer/serializer.js";
import { isTruthy, pick, pickBy, toCamelCase } from "remeda";
import { toJsonSchema } from "@/internals/helpers/schema.js";
import { getProp } from "@/internals/helpers/object.js";
import { ClassConstructor } from "@/internals/types.js";
import { Emitter } from "@/emitter/emitter.js";

export type LangChainToolRunOptions = RunnableConfig & BaseToolRunOptions;
export type LangChainToolOptions<TOutput = any> = BaseToolOptions & {
  outputClass?: typeof JSONToolOutput<TOutput>;
};

export class LangChainTool<T extends AnyZodObject, TOutput = any> extends Tool<
  JSONToolOutput<TOutput>,
  LangChainToolOptions<TOutput>,
  LangChainToolRunOptions
> {
  declare name: string;
  declare description: string;

  protected tool: LCTools.StructuredTool<T>;
  public static serializedSchemaKey = "_internalJsonSchema" as const;

  public readonly emitter: ToolEmitter<ToolEvents<T>, JSONToolOutput<TOutput>>;

  constructor({
    tool,
    ...options
  }: LangChainToolOptions<TOutput> & { tool: LCTools.StructuredTool<T> }) {
    super(options);

    this.tool = tool;
    this.name = tool.name;
    this.description = tool.description;
    this.emitter = Emitter.root.child({
      namespace: ["tool", "langchain", toCamelCase(this.name)],
      creator: this,
    });
  }

  static {
    this.register();

    for (const Class of [LCTools.DynamicTool, LCTools.DynamicStructuredTool] as ClassConstructor<
      LCTools.DynamicStructuredTool | LCTools.DynamicTool
    >[]) {
      Serializer.register(Class, {
        toPlain: (instance) => ({
          options: pickBy(
            {
              ...pick(instance, [
                "name",
                "description",
                "metadata",
                "responseFormat",
                "returnDirect",
                "func",
              ]),
              schema:
                instance.schema instanceof ZodEffects
                  ? toJsonSchema(instance.schema.sourceType())
                  : toJsonSchema(instance.schema),
            },
            isTruthy,
          ),
        }),
        fromPlain: ({ options }) => {
          return new Class({
            ...options,
            metadata: { ...options?.metadata, [LangChainTool.serializedSchemaKey]: options.schema },
          });
        },
      });
    }
  }

  inputSchema(): T {
    const { schema, metadata = {} } = this.tool;

    return getProp(
      metadata,
      [LangChainTool.serializedSchemaKey],
      schema instanceof ZodEffects ? schema.sourceType() : schema,
    );
  }

  protected async _run(
    arg: ToolInput<this>,
    options: Partial<LangChainToolRunOptions>,
    run: GetRunContext<this>,
  ): Promise<JSONToolOutput<TOutput>> {
    const { outputClass = JSONToolOutput } = this.options;
    const raw = await this.tool.invoke(arg, {
      ...options,
      signal: run.signal,
    });
    return new outputClass(raw);
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      tool: this.tool,
    };
  }

  loadSnapshot({ tool, ...snapshot }: ReturnType<typeof this.createSnapshot>) {
    super.loadSnapshot(snapshot);
    this.tool = tool;
  }
}
