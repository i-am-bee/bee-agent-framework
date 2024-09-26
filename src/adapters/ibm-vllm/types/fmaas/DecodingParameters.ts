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

export interface _fmaas_DecodingParameters_LengthPenalty {
  start_index?: number;
  decay_factor?: number | string;
}

export interface _fmaas_DecodingParameters_LengthPenalty__Output {
  start_index: number;
  decay_factor: number;
}

// Original file: src/adapters/ibm-vllm/proto/generation.proto

export const _fmaas_DecodingParameters_ResponseFormat = {
  TEXT: "TEXT",
  JSON: "JSON",
} as const;

export type _fmaas_DecodingParameters_ResponseFormat = "TEXT" | 0 | "JSON" | 1;

export type _fmaas_DecodingParameters_ResponseFormat__Output =
  (typeof _fmaas_DecodingParameters_ResponseFormat)[keyof typeof _fmaas_DecodingParameters_ResponseFormat];

export interface _fmaas_DecodingParameters_StringChoices {
  choices?: string[];
}

export interface _fmaas_DecodingParameters_StringChoices__Output {
  choices: string[];
}

export interface DecodingParameters {
  repetition_penalty?: number | string;
  length_penalty?: _fmaas_DecodingParameters_LengthPenalty | null;
  format?: _fmaas_DecodingParameters_ResponseFormat;
  json_schema?: string;
  regex?: string;
  choice?: _fmaas_DecodingParameters_StringChoices | null;
  grammar?: string;
  _length_penalty?: "length_penalty";
  guided?: "format" | "json_schema" | "regex" | "choice" | "grammar";
}

export interface DecodingParameters__Output {
  repetition_penalty: number;
  length_penalty?: _fmaas_DecodingParameters_LengthPenalty__Output | null;
  format?: _fmaas_DecodingParameters_ResponseFormat__Output;
  json_schema?: string;
  regex?: string;
  choice?: _fmaas_DecodingParameters_StringChoices__Output | null;
  grammar?: string;
  _length_penalty: "length_penalty";
  guided: "format" | "json_schema" | "regex" | "choice" | "grammar";
}
