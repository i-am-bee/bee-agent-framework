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

// Original file: src/adapters/ibm-vllm/proto/generation.proto

export const _fmaas_ModelInfoResponse_ModelKind = {
  DECODER_ONLY: "DECODER_ONLY",
  ENCODER_DECODER: "ENCODER_DECODER",
} as const;

export type _fmaas_ModelInfoResponse_ModelKind = "DECODER_ONLY" | 0 | "ENCODER_DECODER" | 1;

export type _fmaas_ModelInfoResponse_ModelKind__Output =
  (typeof _fmaas_ModelInfoResponse_ModelKind)[keyof typeof _fmaas_ModelInfoResponse_ModelKind];

export interface ModelInfoResponse {
  model_kind?: _fmaas_ModelInfoResponse_ModelKind;
  max_sequence_length?: number;
  max_new_tokens?: number;
}

export interface ModelInfoResponse__Output {
  model_kind: _fmaas_ModelInfoResponse_ModelKind__Output;
  max_sequence_length: number;
  max_new_tokens: number;
}
