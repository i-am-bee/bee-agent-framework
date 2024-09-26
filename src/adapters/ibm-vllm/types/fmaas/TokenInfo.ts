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

export interface _fmaas_TokenInfo_TopToken {
  text?: string;
  logprob?: number | string;
}

export interface _fmaas_TokenInfo_TopToken__Output {
  text: string;
  logprob: number;
}

export interface TokenInfo {
  text?: string;
  logprob?: number | string;
  rank?: number;
  top_tokens?: _fmaas_TokenInfo_TopToken[];
}

export interface TokenInfo__Output {
  text: string;
  logprob: number;
  rank: number;
  top_tokens: _fmaas_TokenInfo_TopToken__Output[];
}
