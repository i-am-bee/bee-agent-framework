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
  DecodingMethod as _fmaas_DecodingMethod,
  DecodingMethod__Output as _fmaas_DecodingMethod__Output,
} from "@/adapters/ibm-vllm/types/fmaas/DecodingMethod.js";
import type {
  SamplingParameters as _fmaas_SamplingParameters,
  SamplingParameters__Output as _fmaas_SamplingParameters__Output,
} from "@/adapters/ibm-vllm/types/fmaas/SamplingParameters.js";
import type {
  StoppingCriteria as _fmaas_StoppingCriteria,
  StoppingCriteria__Output as _fmaas_StoppingCriteria__Output,
} from "@/adapters/ibm-vllm/types/fmaas/StoppingCriteria.js";
import type {
  ResponseOptions as _fmaas_ResponseOptions,
  ResponseOptions__Output as _fmaas_ResponseOptions__Output,
} from "@/adapters/ibm-vllm/types/fmaas/ResponseOptions.js";
import type {
  DecodingParameters as _fmaas_DecodingParameters,
  DecodingParameters__Output as _fmaas_DecodingParameters__Output,
} from "@/adapters/ibm-vllm/types/fmaas/DecodingParameters.js";

export interface Parameters {
  method?: _fmaas_DecodingMethod;
  sampling?: _fmaas_SamplingParameters | null;
  stopping?: _fmaas_StoppingCriteria | null;
  response?: _fmaas_ResponseOptions | null;
  decoding?: _fmaas_DecodingParameters | null;
  truncate_input_tokens?: number;
}

export interface Parameters__Output {
  method: _fmaas_DecodingMethod__Output;
  sampling: _fmaas_SamplingParameters__Output | null;
  stopping: _fmaas_StoppingCriteria__Output | null;
  response: _fmaas_ResponseOptions__Output | null;
  decoding: _fmaas_DecodingParameters__Output | null;
  truncate_input_tokens: number;
}
