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
import { BeeIterationResult, BeeIterationToolResult } from "@/agents/bee/parser.js";
import { BaseMemory } from "@/memory/base.js";
import { BaseMessage } from "@/llms/primitives/message.js";
import { Callback } from "@/emitter/types.js";
import { AnyTool, BaseToolRunOptions, Tool, ToolError, ToolOutput } from "@/tools/base.js";

export interface BeeRunInput {
  prompt: string;
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

export interface BeeUpdateMeta {
  success: boolean;
}

export interface BeeCallbacks {
  start?: Callback<void>;
  error?: Callback<{ error: Error }>;
  retry?: Callback<void>;
  success?: Callback<{
    data: BaseMessage;
    iterations: BeeAgentRunIteration[];
    memory: BaseMemory;
  }>;
  update?: Callback<{
    data: BeeIterationResult;
    update: { key: keyof BeeIterationResult; value: string };
    meta: BeeUpdateMeta;
  }>;
  partialUpdate?: Callback<{
    data: BeeIterationResult;
    update: { key: keyof BeeIterationResult; value: string };
    meta: BeeUpdateMeta;
  }>;
  toolStart?: Callback<{
    data: {
      tool: AnyTool;
      input: unknown;
      options: BaseToolRunOptions;
      iteration: BeeIterationToolResult;
    };
  }>;
  toolSuccess?: Callback<{
    data: {
      tool: AnyTool;
      input: unknown;
      options: BaseToolRunOptions;
      result: ToolOutput;
      iteration: BeeIterationToolResult;
    };
  }>;
  toolError?: Callback<{
    data: {
      tool: AnyTool;
      input: unknown;
      options: BaseToolRunOptions;
      error: ToolError;
      iteration: BeeIterationToolResult;
    };
  }>;
}
