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

import * as grpc from "@grpc/grpc-js";
import {
  Long,
  MethodDefinition,
  MessageTypeDefinition,
  EnumTypeDefinition,
} from "@grpc/proto-loader";

export interface GenerationRequest {
  text?: string;
}
export interface GenerationRequest__Output {
  text: string;
}

declare const DecodingMethod: {
  readonly GREEDY: "GREEDY";
  readonly SAMPLE: "SAMPLE";
};
export type DecodingMethod = "GREEDY" | 0 | "SAMPLE" | 1;
export type DecodingMethod__Output = (typeof DecodingMethod)[keyof typeof DecodingMethod];

export interface SamplingParameters {
  temperature?: number | string;
  top_k?: number;
  top_p?: number | string;
  typical_p?: number | string;
  seed?: number | string | Long;
  _seed?: "seed";
}
export interface SamplingParameters__Output {
  temperature: number;
  top_k: number;
  top_p: number;
  typical_p: number;
  seed?: number;
  _seed: "seed";
}

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

export interface ResponseOptions {
  input_text?: boolean;
  generated_tokens?: boolean;
  input_tokens?: boolean;
  token_logprobs?: boolean;
  token_ranks?: boolean;
  top_n_tokens?: number;
}
export interface ResponseOptions__Output {
  input_text: boolean;
  generated_tokens: boolean;
  input_tokens: boolean;
  token_logprobs: boolean;
  token_ranks: boolean;
  top_n_tokens: number;
}

export interface _fmaas_DecodingParameters_LengthPenalty {
  start_index?: number;
  decay_factor?: number | string;
}
export interface _fmaas_DecodingParameters_LengthPenalty__Output {
  start_index: number;
  decay_factor: number;
}
declare const _fmaas_DecodingParameters_ResponseFormat: {
  readonly TEXT: "TEXT";
  readonly JSON: "JSON";
};
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

export interface Parameters {
  method?: DecodingMethod;
  sampling?: SamplingParameters | null;
  stopping?: StoppingCriteria | null;
  response?: ResponseOptions | null;
  decoding?: DecodingParameters | null;
  truncate_input_tokens?: number;
}
export interface Parameters__Output {
  method: DecodingMethod__Output;
  sampling: SamplingParameters__Output | null;
  stopping: StoppingCriteria__Output | null;
  response: ResponseOptions__Output | null;
  decoding: DecodingParameters__Output | null;
  truncate_input_tokens: number;
}

export interface BatchedGenerationRequest {
  model_id?: string;
  prefix_id?: string;
  requests?: GenerationRequest[];
  adapter_id?: string;
  params?: Parameters | null;
  _prefix_id?: "prefix_id";
  _adapter_id?: "adapter_id";
}
export interface BatchedGenerationRequest__Output {
  model_id: string;
  prefix_id?: string;
  requests: GenerationRequest__Output[];
  adapter_id?: string;
  params: Parameters__Output | null;
  _prefix_id: "prefix_id";
  _adapter_id: "adapter_id";
}

declare const StopReason: {
  readonly NOT_FINISHED: "NOT_FINISHED";
  readonly MAX_TOKENS: "MAX_TOKENS";
  readonly EOS_TOKEN: "EOS_TOKEN";
  readonly CANCELLED: "CANCELLED";
  readonly TIME_LIMIT: "TIME_LIMIT";
  readonly STOP_SEQUENCE: "STOP_SEQUENCE";
  readonly TOKEN_LIMIT: "TOKEN_LIMIT";
  readonly ERROR: "ERROR";
};
export type StopReason =
  | "NOT_FINISHED"
  | 0
  | "MAX_TOKENS"
  | 1
  | "EOS_TOKEN"
  | 2
  | "CANCELLED"
  | 3
  | "TIME_LIMIT"
  | 4
  | "STOP_SEQUENCE"
  | 5
  | "TOKEN_LIMIT"
  | 6
  | "ERROR"
  | 7;
export type StopReason__Output = (typeof StopReason)[keyof typeof StopReason];

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

export interface GenerationResponse {
  generated_token_count?: number;
  text?: string;
  input_token_count?: number;
  stop_reason?: StopReason;
  tokens?: TokenInfo[];
  input_tokens?: TokenInfo[];
  seed?: number | string | Long;
  stop_sequence?: string;
}
export interface GenerationResponse__Output {
  generated_token_count: number;
  text: string;
  input_token_count: number;
  stop_reason: StopReason__Output;
  tokens: TokenInfo__Output[];
  input_tokens: TokenInfo__Output[];
  seed: number;
  stop_sequence: string;
}

export interface BatchedGenerationResponse {
  responses?: GenerationResponse[];
}
export interface BatchedGenerationResponse__Output {
  responses: GenerationResponse__Output[];
}

export interface TokenizeRequest {
  text?: string;
}
export interface TokenizeRequest__Output {
  text: string;
}

export interface BatchedTokenizeRequest {
  model_id?: string;
  requests?: TokenizeRequest[];
  return_tokens?: boolean;
  return_offsets?: boolean;
  truncate_input_tokens?: number;
}
export interface BatchedTokenizeRequest__Output {
  model_id: string;
  requests: TokenizeRequest__Output[];
  return_tokens: boolean;
  return_offsets: boolean;
  truncate_input_tokens: number;
}

export interface _fmaas_TokenizeResponse_Offset {
  start?: number;
  end?: number;
}
export interface _fmaas_TokenizeResponse_Offset__Output {
  start: number;
  end: number;
}
export interface TokenizeResponse {
  token_count?: number;
  tokens?: string[];
  offsets?: _fmaas_TokenizeResponse_Offset[];
}
export interface TokenizeResponse__Output {
  token_count: number;
  tokens: string[];
  offsets: _fmaas_TokenizeResponse_Offset__Output[];
}

export interface BatchedTokenizeResponse {
  responses?: TokenizeResponse[];
}
export interface BatchedTokenizeResponse__Output {
  responses: TokenizeResponse__Output[];
}

export interface ModelInfoRequest {
  model_id?: string;
}
export interface ModelInfoRequest__Output {
  model_id: string;
}

declare const _fmaas_ModelInfoResponse_ModelKind: {
  readonly DECODER_ONLY: "DECODER_ONLY";
  readonly ENCODER_DECODER: "ENCODER_DECODER";
};
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

export interface SingleGenerationRequest {
  model_id?: string;
  prefix_id?: string;
  request?: GenerationRequest | null;
  adapter_id?: string;
  params?: Parameters | null;
  _prefix_id?: "prefix_id";
  _adapter_id?: "adapter_id";
}
export interface SingleGenerationRequest__Output {
  model_id: string;
  prefix_id?: string;
  request: GenerationRequest__Output | null;
  adapter_id?: string;
  params: Parameters__Output | null;
  _prefix_id: "prefix_id";
  _adapter_id: "adapter_id";
}

export interface GenerationServiceClient extends grpc.Client {
  generate(
    argument: BatchedGenerationRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  generate(
    argument: BatchedGenerationRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  generate(
    argument: BatchedGenerationRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  generate(
    argument: BatchedGenerationRequest,
    callback: grpc.requestCallback<BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  generateStream(
    argument: SingleGenerationRequest,
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GenerationResponse__Output>;
  generateStream(
    argument: SingleGenerationRequest,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GenerationResponse__Output>;
  modelInfo(
    argument: ModelInfoRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  modelInfo(
    argument: ModelInfoRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  modelInfo(
    argument: ModelInfoRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  modelInfo(
    argument: ModelInfoRequest,
    callback: grpc.requestCallback<ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  tokenize(
    argument: BatchedTokenizeRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  tokenize(
    argument: BatchedTokenizeRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  tokenize(
    argument: BatchedTokenizeRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  tokenize(
    argument: BatchedTokenizeRequest,
    callback: grpc.requestCallback<BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
}
export interface GenerationServiceDefinition extends grpc.ServiceDefinition {
  Generate: MethodDefinition<
    BatchedGenerationRequest,
    BatchedGenerationResponse,
    BatchedGenerationRequest__Output,
    BatchedGenerationResponse__Output
  >;
  GenerateStream: MethodDefinition<
    SingleGenerationRequest,
    GenerationResponse,
    SingleGenerationRequest__Output,
    GenerationResponse__Output
  >;
  ModelInfo: MethodDefinition<
    ModelInfoRequest,
    ModelInfoResponse,
    ModelInfoRequest__Output,
    ModelInfoResponse__Output
  >;
  Tokenize: MethodDefinition<
    BatchedTokenizeRequest,
    BatchedTokenizeResponse,
    BatchedTokenizeRequest__Output,
    BatchedTokenizeResponse__Output
  >;
}

export type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = new (
  ...args: ConstructorParameters<Constructor>
) => Subtype;
export interface ProtoGrpcType {
  fmaas: {
    BatchedGenerationRequest: MessageTypeDefinition;
    BatchedGenerationResponse: MessageTypeDefinition;
    BatchedTokenizeRequest: MessageTypeDefinition;
    BatchedTokenizeResponse: MessageTypeDefinition;
    DecodingMethod: EnumTypeDefinition;
    DecodingParameters: MessageTypeDefinition;
    GenerationRequest: MessageTypeDefinition;
    GenerationResponse: MessageTypeDefinition;
    GenerationService: SubtypeConstructor<typeof grpc.Client, GenerationServiceClient> & {
      service: GenerationServiceDefinition;
    };
    ModelInfoRequest: MessageTypeDefinition;
    ModelInfoResponse: MessageTypeDefinition;
    Parameters: MessageTypeDefinition;
    ResponseOptions: MessageTypeDefinition;
    SamplingParameters: MessageTypeDefinition;
    SingleGenerationRequest: MessageTypeDefinition;
    StopReason: EnumTypeDefinition;
    StoppingCriteria: MessageTypeDefinition;
    TokenInfo: MessageTypeDefinition;
    TokenizeRequest: MessageTypeDefinition;
    TokenizeResponse: MessageTypeDefinition;
  };
}
