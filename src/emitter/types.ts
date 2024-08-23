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

import { AnyVoid } from "@/internals/types.js";
import { Emitter } from "@/emitter/emitter.js";

export type Matcher = "*" | "*.*" | RegExp | ((event: EventMeta) => boolean);
//export type Callback<T> = ((value: T) => AnyVoid) | ((value: T, event: EventMeta) => AnyVoid);
export type InferCallbackValue<T> = NonNullable<T> extends Callback<infer P> ? P : never;
export type Callback<T> = (value: T, event: EventMeta) => AnyVoid;
export type CleanupFn = () => void;
export type StringKey<T> = Extract<keyof T, string>;
export interface EmitterOptions {
  isBlocking?: boolean;
  once?: boolean;
  persistent?: boolean;
}
export interface EventTrace {
  id: string;
  runId: string;
  parentRunId?: string;
}
export interface EventMeta<C = unknown> {
  id: string;
  groupId?: string;
  name: string;
  path: string;
  createdAt: Date;
  source: Emitter<any>;
  creator: object;
  context: C;
  trace?: EventTrace;
}

// CREATED
// Agent onStart({..., duration: 0, id: 1, parentId: null })
// LLM onStart({..., duration: 0, id: 2, parentId: 1, groupId: xxx })
// LLM onNewToken({..., duration: 10, id: 3, parentId: 1, groupId: xxx })
// LLM onNewToken({..., duration:5, id: 4, parentId: 1, groupId: xxx})
// LLM onNewToken({..., duration: 7, id: 5, parentId: 1, groupId: xxx})
// LLM onNewToken({..., duration:20, id: 6, parentId: 1, groupId: xxx})
// LLM onEnd({..., duration:10+5+7+20, groupId: xxx})
// DESTROYED
