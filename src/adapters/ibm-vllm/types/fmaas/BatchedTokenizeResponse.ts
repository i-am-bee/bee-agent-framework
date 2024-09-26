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
  TokenizeResponse as _fmaas_TokenizeResponse,
  TokenizeResponse__Output as _fmaas_TokenizeResponse__Output,
} from "@/adapters/ibm-vllm/types/fmaas/TokenizeResponse.js";

export interface BatchedTokenizeResponse {
  responses?: _fmaas_TokenizeResponse[];
}

export interface BatchedTokenizeResponse__Output {
  responses: _fmaas_TokenizeResponse__Output[];
}
