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

import { ChatLLMOutput } from "@/llms/chat.js";
import {
  BeeIterationResult,
  BeeIterationResultPartial,
  BeeIterationToolResult,
} from "@/agents/bee/parser.js";
import { BaseMemory } from "@/memory/base.js";
import { BaseMessage } from "@/llms/primitives/message.js";
import { Callback } from "@/emitter/types.js";
import { AnyTool, BaseToolRunOptions, Tool, ToolError, ToolOutput } from "@/tools/base.js";
import {
  BeeSystemPrompt,
  BeeToolErrorPrompt,
  BeeToolInputErrorPrompt,
  BeeToolNoResultsPrompt,
  BeeToolNotFoundPrompt,
  BeeUserEmptyPrompt,
  BeeUserPrompt,
} from "@/agents/bee/prompts.js";

export interface BeeRunInput {
  prompt: string | null;
}

export interface BeeRunOutput {
  result: BaseMessage;
  iterations: BeeAgentRunIteration[];
  memory: BaseMemory;
}

export interface BeeAgentRunIteration {
  raw: ChatLLMOutput;
  state: BeeIterationResult;
}

export interface BeeAgentExecutionConfig {
  totalMaxRetries?: number;
  maxRetriesPerStep?: number;
  maxIterations?: number;
}

export interface BeeRunOptions {
  signal?: AbortSignal;
  execution?: BeeAgentExecutionConfig;
  modifiers?: {
    getToolRunOptions?: <A extends ToolOutput>(execution: {
      tool: Tool<A>;
      input: unknown;
      baseOptions: BaseToolRunOptions;
    }) => BaseToolRunOptions | Promise<BaseToolRunOptions>;
  };
}

export interface BeeMeta {
  iteration: number;
}

export interface BeeUpdateMeta extends BeeMeta {
  success: boolean;
}

export interface BeeCallbacks {
  start?: Callback<{ meta: BeeMeta }>;
  error?: Callback<{ error: Error; meta: BeeMeta }>;
  retry?: Callback<{ meta: BeeMeta }>;
  success?: Callback<{
    data: BaseMessage;
    iterations: BeeAgentRunIteration[];
    memory: BaseMemory;
    meta: BeeMeta;
  }>;
  update?: Callback<{
    data: BeeIterationResult;
    update: { key: keyof BeeIterationResult; value: string; parsedValue: unknown };
    meta: BeeUpdateMeta;
  }>;
  partialUpdate?: Callback<{
    data: BeeIterationResultPartial;
    update: { key: keyof BeeIterationResult; value: string; parsedValue: unknown };
    meta: BeeUpdateMeta;
  }>;
  toolStart?: Callback<{
    data: {
      tool: AnyTool;
      input: unknown;
      options: BaseToolRunOptions;
      iteration: BeeIterationToolResult;
    };
    meta: BeeMeta;
  }>;
  toolSuccess?: Callback<{
    data: {
      tool: AnyTool;
      input: unknown;
      options: BaseToolRunOptions;
      result: ToolOutput;
      iteration: BeeIterationToolResult;
    };
    meta: BeeMeta;
  }>;
  toolError?: Callback<{
    data: {
      tool: AnyTool;
      input: unknown;
      options: BaseToolRunOptions;
      error: ToolError;
      iteration: BeeIterationToolResult;
    };
    meta: BeeMeta;
  }>;
}

export interface BeeAgentTemplates {
  system: typeof BeeSystemPrompt;
  user: typeof BeeUserPrompt;
  userEmpty: typeof BeeUserEmptyPrompt;
  toolError: typeof BeeToolErrorPrompt;
  toolInputError: typeof BeeToolInputErrorPrompt;
  toolNoResultError: typeof BeeToolNoResultsPrompt;
  toolNotFoundError: typeof BeeToolNotFoundPrompt;
}
