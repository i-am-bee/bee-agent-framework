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

import type {
  StopReason as _fmaas_StopReason,
  StopReason__Output as _fmaas_StopReason__Output,
} from "@/adapters/ibm-vllm/types/fmaas/StopReason.js";
import type {
  TokenInfo as _fmaas_TokenInfo,
  TokenInfo__Output as _fmaas_TokenInfo__Output,
} from "@/adapters/ibm-vllm/types/fmaas/TokenInfo.js";
import type { Long } from "@grpc/proto-loader";

export interface GenerationResponse {
  generated_token_count?: number;
  text?: string;
  input_token_count?: number;
  stop_reason?: _fmaas_StopReason;
  tokens?: _fmaas_TokenInfo[];
  input_tokens?: _fmaas_TokenInfo[];
  seed?: number | string | Long;
  stop_sequence?: string;
}

export interface GenerationResponse__Output {
  generated_token_count: number;
  text: string;
  input_token_count: number;
  stop_reason: _fmaas_StopReason__Output;
  tokens: _fmaas_TokenInfo__Output[];
  input_tokens: _fmaas_TokenInfo__Output[];
  seed: number;
  stop_sequence: string;
}
