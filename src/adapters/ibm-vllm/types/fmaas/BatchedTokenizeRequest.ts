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
  TokenizeRequest as _fmaas_TokenizeRequest,
  TokenizeRequest__Output as _fmaas_TokenizeRequest__Output,
} from "@/adapters/ibm-vllm/types/fmaas/TokenizeRequest.js";

export interface BatchedTokenizeRequest {
  model_id?: string;
  requests?: _fmaas_TokenizeRequest[];
  return_tokens?: boolean;
  return_offsets?: boolean;
  truncate_input_tokens?: number;
}

export interface BatchedTokenizeRequest__Output {
  model_id: string;
  requests: _fmaas_TokenizeRequest__Output[];
  return_tokens: boolean;
  return_offsets: boolean;
  truncate_input_tokens: number;
}
