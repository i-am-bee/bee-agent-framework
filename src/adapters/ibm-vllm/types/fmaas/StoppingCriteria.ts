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

// Original file: src/adapters/ibm-vllm/proto/generation.proto

export interface StoppingCriteria {
  max_new_tokens?: number;
  min_new_tokens?: number;
  time_limit_millis?: number;
  stop_sequences?: string[];
  include_stop_sequence?: boolean;
  _include_stop_sequence?: "include_stop_sequence";
}

export interface StoppingCriteria__Output {
  max_new_tokens: number;
  min_new_tokens: number;
  time_limit_millis: number;
  stop_sequences: string[];
  include_stop_sequence?: boolean;
  _include_stop_sequence: "include_stop_sequence";
}
