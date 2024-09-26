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
  GenerationRequest as _fmaas_GenerationRequest,
  GenerationRequest__Output as _fmaas_GenerationRequest__Output,
} from "@/adapters/ibm-vllm/types/fmaas/GenerationRequest.js";
import type {
  Parameters as _fmaas_Parameters,
  Parameters__Output as _fmaas_Parameters__Output,
} from "@/adapters/ibm-vllm/types/fmaas/Parameters.js";

export interface SingleGenerationRequest {
  model_id?: string;
  prefix_id?: string;
  request?: _fmaas_GenerationRequest | null;
  adapter_id?: string;
  params?: _fmaas_Parameters | null;
  _prefix_id?: "prefix_id";
  _adapter_id?: "adapter_id";
}

export interface SingleGenerationRequest__Output {
  model_id: string;
  prefix_id?: string;
  request: _fmaas_GenerationRequest__Output | null;
  adapter_id?: string;
  params: _fmaas_Parameters__Output | null;
  _prefix_id: "prefix_id";
  _adapter_id: "adapter_id";
}
