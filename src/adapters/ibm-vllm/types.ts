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

export interface BidiStreamingTokenClassificationTaskRequest {
  text_stream?: string;
  threshold?: number | string;
  _threshold?: "threshold";
}
export interface BidiStreamingTokenClassificationTaskRequest__Output {
  text_stream: string;
  threshold?: number;
  _threshold: "threshold";
}

export interface ClassificationResult {
  label?: string;
  score?: number | string;
}
export interface ClassificationResult__Output {
  label: string;
  score: number;
}

export interface ClassificationResults {
  results?: ClassificationResult[];
}
export interface ClassificationResults__Output {
  results: ClassificationResult__Output[];
}

export interface PyFloatSequence {
  values?: (number | string)[];
}
export interface PyFloatSequence__Output {
  values: number[];
}

export interface NpFloat32Sequence {
  values?: (number | string)[];
}
export interface NpFloat32Sequence__Output {
  values: number[];
}

export interface NpFloat64Sequence {
  values?: (number | string)[];
}
export interface NpFloat64Sequence__Output {
  values: number[];
}

export interface Vector1D {
  data_pyfloatsequence?: PyFloatSequence | null;
  data_npfloat32sequence?: NpFloat32Sequence | null;
  data_npfloat64sequence?: NpFloat64Sequence | null;
  data?: "data_pyfloatsequence" | "data_npfloat32sequence" | "data_npfloat64sequence";
}
export interface Vector1D__Output {
  data_pyfloatsequence?: PyFloatSequence__Output | null;
  data_npfloat32sequence?: NpFloat32Sequence__Output | null;
  data_npfloat64sequence?: NpFloat64Sequence__Output | null;
  data: "data_pyfloatsequence" | "data_npfloat32sequence" | "data_npfloat64sequence";
}

export interface ProducerId {
  name?: string;
  version?: string;
}
export interface ProducerId__Output {
  name: string;
  version: string;
}

export interface EmbeddingResult {
  result?: Vector1D | null;
  producer_id?: ProducerId | null;
  input_token_count?: number | string | Long;
}
export interface EmbeddingResult__Output {
  result: Vector1D__Output | null;
  producer_id: ProducerId__Output | null;
  input_token_count: number;
}

export interface ListOfVector1D {
  vectors?: Vector1D[];
}
export interface ListOfVector1D__Output {
  vectors: Vector1D__Output[];
}

export interface EmbeddingResults {
  results?: ListOfVector1D | null;
  producer_id?: ProducerId | null;
  input_token_count?: number | string | Long;
}
export interface EmbeddingResults__Output {
  results: ListOfVector1D__Output | null;
  producer_id: ProducerId__Output | null;
  input_token_count: number;
}

export interface EmbeddingTaskRequest {
  text?: string;
  truncate_input_tokens?: number | string | Long;
  _truncate_input_tokens?: "truncate_input_tokens";
}
export interface EmbeddingTaskRequest__Output {
  text: string;
  truncate_input_tokens?: number;
  _truncate_input_tokens: "truncate_input_tokens";
}

export interface EmbeddingTasksRequest {
  texts?: string[];
  truncate_input_tokens?: number | string | Long;
  _truncate_input_tokens?: "truncate_input_tokens";
}
export interface EmbeddingTasksRequest__Output {
  texts: string[];
  truncate_input_tokens?: number;
  _truncate_input_tokens: "truncate_input_tokens";
}

declare const FinishReason: {
  readonly NOT_FINISHED: "NOT_FINISHED";
  readonly MAX_TOKENS: "MAX_TOKENS";
  readonly EOS_TOKEN: "EOS_TOKEN";
  readonly CANCELLED: "CANCELLED";
  readonly TIME_LIMIT: "TIME_LIMIT";
  readonly STOP_SEQUENCE: "STOP_SEQUENCE";
  readonly TOKEN_LIMIT: "TOKEN_LIMIT";
  readonly ERROR: "ERROR";
};
export type FinishReason =
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
export type FinishReason__Output = (typeof FinishReason)[keyof typeof FinishReason];

export interface GeneratedToken {
  text?: string;
  logprob?: number | string;
}
export interface GeneratedToken__Output {
  text: string;
  logprob: number;
}

export interface GeneratedTextResult {
  generated_text?: string;
  generated_tokens?: number | string | Long;
  finish_reason?: FinishReason;
  producer_id?: ProducerId | null;
  input_token_count?: number | string | Long;
  seed?: number | string | Long;
  tokens?: GeneratedToken[];
  input_tokens?: GeneratedToken[];
}
export interface GeneratedTextResult__Output {
  generated_text: string;
  generated_tokens: number;
  finish_reason: FinishReason__Output;
  producer_id: ProducerId__Output | null;
  input_token_count: number;
  seed: number;
  tokens: GeneratedToken__Output[];
  input_tokens: GeneratedToken__Output[];
}

export interface TokenStreamDetails {
  finish_reason?: FinishReason;
  generated_tokens?: number;
  seed?: number | string | Long;
  input_token_count?: number | string | Long;
}
export interface TokenStreamDetails__Output {
  finish_reason: FinishReason__Output;
  generated_tokens: number;
  seed: number;
  input_token_count: number;
}

export interface GeneratedTextStreamResult {
  generated_text?: string;
  tokens?: GeneratedToken[];
  details?: TokenStreamDetails | null;
  producer_id?: ProducerId | null;
  input_tokens?: GeneratedToken[];
}
export interface GeneratedTextStreamResult__Output {
  generated_text: string;
  tokens: GeneratedToken__Output[];
  details: TokenStreamDetails__Output | null;
  producer_id: ProducerId__Output | null;
  input_tokens: GeneratedToken__Output[];
}

declare const NullValue: {
  readonly NULL_VALUE: "NULL_VALUE";
};
export type NullValue = "NULL_VALUE" | 0;
export type NullValue__Output = (typeof NullValue)[keyof typeof NullValue];

export interface ListValue {
  values?: Value[];
}
export interface ListValue__Output {
  values: Value__Output[];
}

export interface Value {
  nullValue?: NullValue;
  numberValue?: number | string;
  stringValue?: string;
  boolValue?: boolean;
  structValue?: Struct | null;
  listValue?: ListValue | null;
  kind?: "nullValue" | "numberValue" | "stringValue" | "boolValue" | "structValue" | "listValue";
}
export interface Value__Output {
  nullValue?: NullValue__Output;
  numberValue?: number;
  stringValue?: string;
  boolValue?: boolean;
  structValue?: Struct__Output | null;
  listValue?: ListValue__Output | null;
  kind: "nullValue" | "numberValue" | "stringValue" | "boolValue" | "structValue" | "listValue";
}

export interface Struct {
  fields?: Record<string, Value>;
}
export interface Struct__Output {
  fields: Record<string, Value__Output>;
}

export interface RerankScore {
  document?: Struct | null;
  index?: number | string | Long;
  score?: number | string;
  text?: string;
}
export interface RerankScore__Output {
  document: Struct__Output | null;
  index: number;
  score: number;
  text: string;
}

export interface RerankScores {
  query?: string;
  scores?: RerankScore[];
}
export interface RerankScores__Output {
  query: string;
  scores: RerankScore__Output[];
}

export interface RerankResult {
  result?: RerankScores | null;
  producer_id?: ProducerId | null;
  input_token_count?: number | string | Long;
}
export interface RerankResult__Output {
  result: RerankScores__Output | null;
  producer_id: ProducerId__Output | null;
  input_token_count: number;
}

export interface RerankResults {
  results?: RerankScores[];
  producer_id?: ProducerId | null;
  input_token_count?: number | string | Long;
}
export interface RerankResults__Output {
  results: RerankScores__Output[];
  producer_id: ProducerId__Output | null;
  input_token_count: number;
}

export interface RerankTaskRequest {
  query?: string;
  documents?: Struct[];
  top_n?: number | string | Long;
  truncate_input_tokens?: number | string | Long;
  return_documents?: boolean;
  return_query?: boolean;
  return_text?: boolean;
  _top_n?: "top_n";
  _truncate_input_tokens?: "truncate_input_tokens";
  _return_documents?: "return_documents";
  _return_query?: "return_query";
  _return_text?: "return_text";
}
export interface RerankTaskRequest__Output {
  query: string;
  documents: Struct__Output[];
  top_n?: number;
  truncate_input_tokens?: number;
  return_documents?: boolean;
  return_query?: boolean;
  return_text?: boolean;
  _top_n: "top_n";
  _truncate_input_tokens: "truncate_input_tokens";
  _return_documents: "return_documents";
  _return_query: "return_query";
  _return_text: "return_text";
}

export interface RerankTasksRequest {
  queries?: string[];
  documents?: Struct[];
  top_n?: number | string | Long;
  truncate_input_tokens?: number | string | Long;
  return_documents?: boolean;
  return_queries?: boolean;
  return_text?: boolean;
  _top_n?: "top_n";
  _truncate_input_tokens?: "truncate_input_tokens";
  _return_documents?: "return_documents";
  _return_queries?: "return_queries";
  _return_text?: "return_text";
}
export interface RerankTasksRequest__Output {
  queries: string[];
  documents: Struct__Output[];
  top_n?: number;
  truncate_input_tokens?: number;
  return_documents?: boolean;
  return_queries?: boolean;
  return_text?: boolean;
  _top_n: "top_n";
  _truncate_input_tokens: "truncate_input_tokens";
  _return_documents: "return_documents";
  _return_queries: "return_queries";
  _return_text: "return_text";
}

export interface SentenceSimilarityScores {
  scores?: (number | string)[];
}
export interface SentenceSimilarityScores__Output {
  scores: number[];
}

export interface SentenceSimilarityResult {
  result?: SentenceSimilarityScores | null;
  producer_id?: ProducerId | null;
  input_token_count?: number | string | Long;
}
export interface SentenceSimilarityResult__Output {
  result: SentenceSimilarityScores__Output | null;
  producer_id: ProducerId__Output | null;
  input_token_count: number;
}

export interface SentenceSimilarityResults {
  results?: SentenceSimilarityScores[];
  producer_id?: ProducerId | null;
  input_token_count?: number | string | Long;
}
export interface SentenceSimilarityResults__Output {
  results: SentenceSimilarityScores__Output[];
  producer_id: ProducerId__Output | null;
  input_token_count: number;
}

export interface SentenceSimilarityTaskRequest {
  source_sentence?: string;
  sentences?: string[];
  truncate_input_tokens?: number | string | Long;
  _truncate_input_tokens?: "truncate_input_tokens";
}
export interface SentenceSimilarityTaskRequest__Output {
  source_sentence: string;
  sentences: string[];
  truncate_input_tokens?: number;
  _truncate_input_tokens: "truncate_input_tokens";
}

export interface SentenceSimilarityTasksRequest {
  source_sentences?: string[];
  sentences?: string[];
  truncate_input_tokens?: number | string | Long;
  _truncate_input_tokens?: "truncate_input_tokens";
}
export interface SentenceSimilarityTasksRequest__Output {
  source_sentences: string[];
  sentences: string[];
  truncate_input_tokens?: number;
  _truncate_input_tokens: "truncate_input_tokens";
}

export interface ExponentialDecayLengthPenalty {
  start_index?: number | string | Long;
  decay_factor?: number | string;
}
export interface ExponentialDecayLengthPenalty__Output {
  start_index: number;
  decay_factor: number;
}

export interface ServerStreamingTextGenerationTaskRequest {
  text?: string;
  max_new_tokens?: number | string | Long;
  min_new_tokens?: number | string | Long;
  truncate_input_tokens?: number | string | Long;
  decoding_method?: string;
  top_k?: number | string | Long;
  top_p?: number | string;
  typical_p?: number | string;
  temperature?: number | string;
  repetition_penalty?: number | string;
  max_time?: number | string;
  exponential_decay_length_penalty?: ExponentialDecayLengthPenalty | null;
  stop_sequences?: string[];
  seed?: number | string | Long;
  preserve_input_text?: boolean;
  _max_new_tokens?: "max_new_tokens";
  _min_new_tokens?: "min_new_tokens";
  _truncate_input_tokens?: "truncate_input_tokens";
  _decoding_method?: "decoding_method";
  _top_k?: "top_k";
  _top_p?: "top_p";
  _typical_p?: "typical_p";
  _temperature?: "temperature";
  _repetition_penalty?: "repetition_penalty";
  _max_time?: "max_time";
  _exponential_decay_length_penalty?: "exponential_decay_length_penalty";
  _seed?: "seed";
  _preserve_input_text?: "preserve_input_text";
}
export interface ServerStreamingTextGenerationTaskRequest__Output {
  text: string;
  max_new_tokens?: number;
  min_new_tokens?: number;
  truncate_input_tokens?: number;
  decoding_method?: string;
  top_k?: number;
  top_p?: number;
  typical_p?: number;
  temperature?: number;
  repetition_penalty?: number;
  max_time?: number;
  exponential_decay_length_penalty?: ExponentialDecayLengthPenalty__Output | null;
  stop_sequences: string[];
  seed?: number;
  preserve_input_text?: boolean;
  _max_new_tokens: "max_new_tokens";
  _min_new_tokens: "min_new_tokens";
  _truncate_input_tokens: "truncate_input_tokens";
  _decoding_method: "decoding_method";
  _top_k: "top_k";
  _top_p: "top_p";
  _typical_p: "typical_p";
  _temperature: "temperature";
  _repetition_penalty: "repetition_penalty";
  _max_time: "max_time";
  _exponential_decay_length_penalty: "exponential_decay_length_penalty";
  _seed: "seed";
  _preserve_input_text: "preserve_input_text";
}

export interface TextClassificationTaskRequest {
  text?: string;
}
export interface TextClassificationTaskRequest__Output {
  text: string;
}

export interface TextGenerationTaskRequest {
  text?: string;
  max_new_tokens?: number | string | Long;
  min_new_tokens?: number | string | Long;
  truncate_input_tokens?: number | string | Long;
  decoding_method?: string;
  top_k?: number | string | Long;
  top_p?: number | string;
  typical_p?: number | string;
  temperature?: number | string;
  repetition_penalty?: number | string;
  max_time?: number | string;
  exponential_decay_length_penalty?: ExponentialDecayLengthPenalty | null;
  stop_sequences?: string[];
  seed?: number | string | Long;
  preserve_input_text?: boolean;
  _max_new_tokens?: "max_new_tokens";
  _min_new_tokens?: "min_new_tokens";
  _truncate_input_tokens?: "truncate_input_tokens";
  _decoding_method?: "decoding_method";
  _top_k?: "top_k";
  _top_p?: "top_p";
  _typical_p?: "typical_p";
  _temperature?: "temperature";
  _repetition_penalty?: "repetition_penalty";
  _max_time?: "max_time";
  _exponential_decay_length_penalty?: "exponential_decay_length_penalty";
  _seed?: "seed";
  _preserve_input_text?: "preserve_input_text";
}
export interface TextGenerationTaskRequest__Output {
  text: string;
  max_new_tokens?: number;
  min_new_tokens?: number;
  truncate_input_tokens?: number;
  decoding_method?: string;
  top_k?: number;
  top_p?: number;
  typical_p?: number;
  temperature?: number;
  repetition_penalty?: number;
  max_time?: number;
  exponential_decay_length_penalty?: ExponentialDecayLengthPenalty__Output | null;
  stop_sequences: string[];
  seed?: number;
  preserve_input_text?: boolean;
  _max_new_tokens: "max_new_tokens";
  _min_new_tokens: "min_new_tokens";
  _truncate_input_tokens: "truncate_input_tokens";
  _decoding_method: "decoding_method";
  _top_k: "top_k";
  _top_p: "top_p";
  _typical_p: "typical_p";
  _temperature: "temperature";
  _repetition_penalty: "repetition_penalty";
  _max_time: "max_time";
  _exponential_decay_length_penalty: "exponential_decay_length_penalty";
  _seed: "seed";
  _preserve_input_text: "preserve_input_text";
}

export interface TokenClassificationResult {
  start?: number | string | Long;
  end?: number | string | Long;
  word?: string;
  entity?: string;
  entity_group?: string;
  score?: number | string;
  token_count?: number | string | Long;
}
export interface TokenClassificationResult__Output {
  start: number;
  end: number;
  word: string;
  entity: string;
  entity_group: string;
  score: number;
  token_count: number;
}

export interface TokenClassificationResults {
  results?: TokenClassificationResult[];
}
export interface TokenClassificationResults__Output {
  results: TokenClassificationResult__Output[];
}

export interface TokenClassificationStreamResult {
  results?: TokenClassificationResult[];
  processed_index?: number | string | Long;
  start_index?: number | string | Long;
}
export interface TokenClassificationStreamResult__Output {
  results: TokenClassificationResult__Output[];
  processed_index: number;
  start_index: number;
}

export interface TokenClassificationTaskRequest {
  text?: string;
  threshold?: number | string;
  _threshold?: "threshold";
}
export interface TokenClassificationTaskRequest__Output {
  text: string;
  threshold?: number;
  _threshold: "threshold";
}

export interface Token {
  start?: number | string | Long;
  end?: number | string | Long;
  text?: string;
}
export interface Token__Output {
  start: number;
  end: number;
  text: string;
}

export interface TokenizationResults {
  results?: Token[];
  token_count?: number | string | Long;
}
export interface TokenizationResults__Output {
  results: Token__Output[];
  token_count: number;
}

export interface TokenizationTaskRequest {
  text?: string;
}
export interface TokenizationTaskRequest__Output {
  text: string;
}

export interface NlpServiceClient extends grpc.Client {
  BidiStreamingTokenClassificationTaskPredict(
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ): grpc.ClientDuplexStream<
    BidiStreamingTokenClassificationTaskRequest,
    TokenClassificationStreamResult__Output
  >;
  BidiStreamingTokenClassificationTaskPredict(
    options?: grpc.CallOptions,
  ): grpc.ClientDuplexStream<
    BidiStreamingTokenClassificationTaskRequest,
    TokenClassificationStreamResult__Output
  >;
  bidiStreamingTokenClassificationTaskPredict(
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ): grpc.ClientDuplexStream<
    BidiStreamingTokenClassificationTaskRequest,
    TokenClassificationStreamResult__Output
  >;
  bidiStreamingTokenClassificationTaskPredict(
    options?: grpc.CallOptions,
  ): grpc.ClientDuplexStream<
    BidiStreamingTokenClassificationTaskRequest,
    TokenClassificationStreamResult__Output
  >;
  EmbeddingTaskPredict(
    argument: EmbeddingTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<EmbeddingResult__Output>,
  ): grpc.ClientUnaryCall;
  EmbeddingTaskPredict(
    argument: EmbeddingTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<EmbeddingResult__Output>,
  ): grpc.ClientUnaryCall;
  EmbeddingTaskPredict(
    argument: EmbeddingTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<EmbeddingResult__Output>,
  ): grpc.ClientUnaryCall;
  EmbeddingTaskPredict(
    argument: EmbeddingTaskRequest,
    callback: grpc.requestCallback<EmbeddingResult__Output>,
  ): grpc.ClientUnaryCall;
  embeddingTaskPredict(
    argument: EmbeddingTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<EmbeddingResult__Output>,
  ): grpc.ClientUnaryCall;
  embeddingTaskPredict(
    argument: EmbeddingTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<EmbeddingResult__Output>,
  ): grpc.ClientUnaryCall;
  embeddingTaskPredict(
    argument: EmbeddingTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<EmbeddingResult__Output>,
  ): grpc.ClientUnaryCall;
  embeddingTaskPredict(
    argument: EmbeddingTaskRequest,
    callback: grpc.requestCallback<EmbeddingResult__Output>,
  ): grpc.ClientUnaryCall;
  EmbeddingTasksPredict(
    argument: EmbeddingTasksRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<EmbeddingResults__Output>,
  ): grpc.ClientUnaryCall;
  EmbeddingTasksPredict(
    argument: EmbeddingTasksRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<EmbeddingResults__Output>,
  ): grpc.ClientUnaryCall;
  EmbeddingTasksPredict(
    argument: EmbeddingTasksRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<EmbeddingResults__Output>,
  ): grpc.ClientUnaryCall;
  EmbeddingTasksPredict(
    argument: EmbeddingTasksRequest,
    callback: grpc.requestCallback<EmbeddingResults__Output>,
  ): grpc.ClientUnaryCall;
  embeddingTasksPredict(
    argument: EmbeddingTasksRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<EmbeddingResults__Output>,
  ): grpc.ClientUnaryCall;
  embeddingTasksPredict(
    argument: EmbeddingTasksRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<EmbeddingResults__Output>,
  ): grpc.ClientUnaryCall;
  embeddingTasksPredict(
    argument: EmbeddingTasksRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<EmbeddingResults__Output>,
  ): grpc.ClientUnaryCall;
  embeddingTasksPredict(
    argument: EmbeddingTasksRequest,
    callback: grpc.requestCallback<EmbeddingResults__Output>,
  ): grpc.ClientUnaryCall;
  RerankTaskPredict(
    argument: RerankTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<RerankResult__Output>,
  ): grpc.ClientUnaryCall;
  RerankTaskPredict(
    argument: RerankTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<RerankResult__Output>,
  ): grpc.ClientUnaryCall;
  RerankTaskPredict(
    argument: RerankTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<RerankResult__Output>,
  ): grpc.ClientUnaryCall;
  RerankTaskPredict(
    argument: RerankTaskRequest,
    callback: grpc.requestCallback<RerankResult__Output>,
  ): grpc.ClientUnaryCall;
  rerankTaskPredict(
    argument: RerankTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<RerankResult__Output>,
  ): grpc.ClientUnaryCall;
  rerankTaskPredict(
    argument: RerankTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<RerankResult__Output>,
  ): grpc.ClientUnaryCall;
  rerankTaskPredict(
    argument: RerankTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<RerankResult__Output>,
  ): grpc.ClientUnaryCall;
  rerankTaskPredict(
    argument: RerankTaskRequest,
    callback: grpc.requestCallback<RerankResult__Output>,
  ): grpc.ClientUnaryCall;
  RerankTasksPredict(
    argument: RerankTasksRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<RerankResults__Output>,
  ): grpc.ClientUnaryCall;
  RerankTasksPredict(
    argument: RerankTasksRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<RerankResults__Output>,
  ): grpc.ClientUnaryCall;
  RerankTasksPredict(
    argument: RerankTasksRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<RerankResults__Output>,
  ): grpc.ClientUnaryCall;
  RerankTasksPredict(
    argument: RerankTasksRequest,
    callback: grpc.requestCallback<RerankResults__Output>,
  ): grpc.ClientUnaryCall;
  rerankTasksPredict(
    argument: RerankTasksRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<RerankResults__Output>,
  ): grpc.ClientUnaryCall;
  rerankTasksPredict(
    argument: RerankTasksRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<RerankResults__Output>,
  ): grpc.ClientUnaryCall;
  rerankTasksPredict(
    argument: RerankTasksRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<RerankResults__Output>,
  ): grpc.ClientUnaryCall;
  rerankTasksPredict(
    argument: RerankTasksRequest,
    callback: grpc.requestCallback<RerankResults__Output>,
  ): grpc.ClientUnaryCall;
  SentenceSimilarityTaskPredict(
    argument: SentenceSimilarityTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<SentenceSimilarityResult__Output>,
  ): grpc.ClientUnaryCall;
  SentenceSimilarityTaskPredict(
    argument: SentenceSimilarityTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<SentenceSimilarityResult__Output>,
  ): grpc.ClientUnaryCall;
  SentenceSimilarityTaskPredict(
    argument: SentenceSimilarityTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<SentenceSimilarityResult__Output>,
  ): grpc.ClientUnaryCall;
  SentenceSimilarityTaskPredict(
    argument: SentenceSimilarityTaskRequest,
    callback: grpc.requestCallback<SentenceSimilarityResult__Output>,
  ): grpc.ClientUnaryCall;
  sentenceSimilarityTaskPredict(
    argument: SentenceSimilarityTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<SentenceSimilarityResult__Output>,
  ): grpc.ClientUnaryCall;
  sentenceSimilarityTaskPredict(
    argument: SentenceSimilarityTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<SentenceSimilarityResult__Output>,
  ): grpc.ClientUnaryCall;
  sentenceSimilarityTaskPredict(
    argument: SentenceSimilarityTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<SentenceSimilarityResult__Output>,
  ): grpc.ClientUnaryCall;
  sentenceSimilarityTaskPredict(
    argument: SentenceSimilarityTaskRequest,
    callback: grpc.requestCallback<SentenceSimilarityResult__Output>,
  ): grpc.ClientUnaryCall;
  SentenceSimilarityTasksPredict(
    argument: SentenceSimilarityTasksRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<SentenceSimilarityResults__Output>,
  ): grpc.ClientUnaryCall;
  SentenceSimilarityTasksPredict(
    argument: SentenceSimilarityTasksRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<SentenceSimilarityResults__Output>,
  ): grpc.ClientUnaryCall;
  SentenceSimilarityTasksPredict(
    argument: SentenceSimilarityTasksRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<SentenceSimilarityResults__Output>,
  ): grpc.ClientUnaryCall;
  SentenceSimilarityTasksPredict(
    argument: SentenceSimilarityTasksRequest,
    callback: grpc.requestCallback<SentenceSimilarityResults__Output>,
  ): grpc.ClientUnaryCall;
  sentenceSimilarityTasksPredict(
    argument: SentenceSimilarityTasksRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<SentenceSimilarityResults__Output>,
  ): grpc.ClientUnaryCall;
  sentenceSimilarityTasksPredict(
    argument: SentenceSimilarityTasksRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<SentenceSimilarityResults__Output>,
  ): grpc.ClientUnaryCall;
  sentenceSimilarityTasksPredict(
    argument: SentenceSimilarityTasksRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<SentenceSimilarityResults__Output>,
  ): grpc.ClientUnaryCall;
  sentenceSimilarityTasksPredict(
    argument: SentenceSimilarityTasksRequest,
    callback: grpc.requestCallback<SentenceSimilarityResults__Output>,
  ): grpc.ClientUnaryCall;
  ServerStreamingTextGenerationTaskPredict(
    argument: ServerStreamingTextGenerationTaskRequest,
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GeneratedTextStreamResult__Output>;
  ServerStreamingTextGenerationTaskPredict(
    argument: ServerStreamingTextGenerationTaskRequest,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GeneratedTextStreamResult__Output>;
  serverStreamingTextGenerationTaskPredict(
    argument: ServerStreamingTextGenerationTaskRequest,
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GeneratedTextStreamResult__Output>;
  serverStreamingTextGenerationTaskPredict(
    argument: ServerStreamingTextGenerationTaskRequest,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GeneratedTextStreamResult__Output>;
  TextClassificationTaskPredict(
    argument: TextClassificationTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<ClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  TextClassificationTaskPredict(
    argument: TextClassificationTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<ClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  TextClassificationTaskPredict(
    argument: TextClassificationTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<ClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  TextClassificationTaskPredict(
    argument: TextClassificationTaskRequest,
    callback: grpc.requestCallback<ClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  textClassificationTaskPredict(
    argument: TextClassificationTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<ClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  textClassificationTaskPredict(
    argument: TextClassificationTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<ClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  textClassificationTaskPredict(
    argument: TextClassificationTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<ClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  textClassificationTaskPredict(
    argument: TextClassificationTaskRequest,
    callback: grpc.requestCallback<ClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskPredict(
    argument: TextGenerationTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<GeneratedTextResult__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskPredict(
    argument: TextGenerationTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<GeneratedTextResult__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskPredict(
    argument: TextGenerationTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<GeneratedTextResult__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskPredict(
    argument: TextGenerationTaskRequest,
    callback: grpc.requestCallback<GeneratedTextResult__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskPredict(
    argument: TextGenerationTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<GeneratedTextResult__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskPredict(
    argument: TextGenerationTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<GeneratedTextResult__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskPredict(
    argument: TextGenerationTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<GeneratedTextResult__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskPredict(
    argument: TextGenerationTaskRequest,
    callback: grpc.requestCallback<GeneratedTextResult__Output>,
  ): grpc.ClientUnaryCall;
  TokenClassificationTaskPredict(
    argument: TokenClassificationTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TokenClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  TokenClassificationTaskPredict(
    argument: TokenClassificationTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<TokenClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  TokenClassificationTaskPredict(
    argument: TokenClassificationTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TokenClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  TokenClassificationTaskPredict(
    argument: TokenClassificationTaskRequest,
    callback: grpc.requestCallback<TokenClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  tokenClassificationTaskPredict(
    argument: TokenClassificationTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TokenClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  tokenClassificationTaskPredict(
    argument: TokenClassificationTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<TokenClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  tokenClassificationTaskPredict(
    argument: TokenClassificationTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TokenClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  tokenClassificationTaskPredict(
    argument: TokenClassificationTaskRequest,
    callback: grpc.requestCallback<TokenClassificationResults__Output>,
  ): grpc.ClientUnaryCall;
  TokenizationTaskPredict(
    argument: TokenizationTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TokenizationResults__Output>,
  ): grpc.ClientUnaryCall;
  TokenizationTaskPredict(
    argument: TokenizationTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<TokenizationResults__Output>,
  ): grpc.ClientUnaryCall;
  TokenizationTaskPredict(
    argument: TokenizationTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TokenizationResults__Output>,
  ): grpc.ClientUnaryCall;
  TokenizationTaskPredict(
    argument: TokenizationTaskRequest,
    callback: grpc.requestCallback<TokenizationResults__Output>,
  ): grpc.ClientUnaryCall;
  tokenizationTaskPredict(
    argument: TokenizationTaskRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TokenizationResults__Output>,
  ): grpc.ClientUnaryCall;
  tokenizationTaskPredict(
    argument: TokenizationTaskRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<TokenizationResults__Output>,
  ): grpc.ClientUnaryCall;
  tokenizationTaskPredict(
    argument: TokenizationTaskRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TokenizationResults__Output>,
  ): grpc.ClientUnaryCall;
  tokenizationTaskPredict(
    argument: TokenizationTaskRequest,
    callback: grpc.requestCallback<TokenizationResults__Output>,
  ): grpc.ClientUnaryCall;
}
export interface NlpServiceDefinition extends grpc.ServiceDefinition {
  BidiStreamingTokenClassificationTaskPredict: MethodDefinition<
    BidiStreamingTokenClassificationTaskRequest,
    TokenClassificationStreamResult,
    BidiStreamingTokenClassificationTaskRequest__Output,
    TokenClassificationStreamResult__Output
  >;
  EmbeddingTaskPredict: MethodDefinition<
    EmbeddingTaskRequest,
    EmbeddingResult,
    EmbeddingTaskRequest__Output,
    EmbeddingResult__Output
  >;
  EmbeddingTasksPredict: MethodDefinition<
    EmbeddingTasksRequest,
    EmbeddingResults,
    EmbeddingTasksRequest__Output,
    EmbeddingResults__Output
  >;
  RerankTaskPredict: MethodDefinition<
    RerankTaskRequest,
    RerankResult,
    RerankTaskRequest__Output,
    RerankResult__Output
  >;
  RerankTasksPredict: MethodDefinition<
    RerankTasksRequest,
    RerankResults,
    RerankTasksRequest__Output,
    RerankResults__Output
  >;
  SentenceSimilarityTaskPredict: MethodDefinition<
    SentenceSimilarityTaskRequest,
    SentenceSimilarityResult,
    SentenceSimilarityTaskRequest__Output,
    SentenceSimilarityResult__Output
  >;
  SentenceSimilarityTasksPredict: MethodDefinition<
    SentenceSimilarityTasksRequest,
    SentenceSimilarityResults,
    SentenceSimilarityTasksRequest__Output,
    SentenceSimilarityResults__Output
  >;
  ServerStreamingTextGenerationTaskPredict: MethodDefinition<
    ServerStreamingTextGenerationTaskRequest,
    GeneratedTextStreamResult,
    ServerStreamingTextGenerationTaskRequest__Output,
    GeneratedTextStreamResult__Output
  >;
  TextClassificationTaskPredict: MethodDefinition<
    TextClassificationTaskRequest,
    ClassificationResults,
    TextClassificationTaskRequest__Output,
    ClassificationResults__Output
  >;
  TextGenerationTaskPredict: MethodDefinition<
    TextGenerationTaskRequest,
    GeneratedTextResult,
    TextGenerationTaskRequest__Output,
    GeneratedTextResult__Output
  >;
  TokenClassificationTaskPredict: MethodDefinition<
    TokenClassificationTaskRequest,
    TokenClassificationResults,
    TokenClassificationTaskRequest__Output,
    TokenClassificationResults__Output
  >;
  TokenizationTaskPredict: MethodDefinition<
    TokenizationTaskRequest,
    TokenizationResults,
    TokenizationTaskRequest__Output,
    TokenizationResults__Output
  >;
}

export interface S3Path {
  path?: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
  IAM_id?: string;
  IAM_api_key?: string;
}
export interface S3Path__Output {
  path: string;
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  IAM_id: string;
  IAM_api_key: string;
}

export interface GenerationTrainRecord {
  input?: string;
  output?: string;
}
export interface GenerationTrainRecord__Output {
  input: string;
  output: string;
}

export interface DataStreamSourceGenerationTrainRecordJsonData {
  data?: GenerationTrainRecord[];
}
export interface DataStreamSourceGenerationTrainRecordJsonData__Output {
  data: GenerationTrainRecord__Output[];
}

export interface FileReference {
  filename?: string;
}
export interface FileReference__Output {
  filename: string;
}

export interface ListOfFileReferences {
  files?: string[];
}
export interface ListOfFileReferences__Output {
  files: string[];
}

export interface Directory {
  dirname?: string;
  extension?: string;
}
export interface Directory__Output {
  dirname: string;
  extension: string;
}

export interface S3Files {
  files?: string[];
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
  IAM_id?: string;
  IAM_api_key?: string;
}
export interface S3Files__Output {
  files: string[];
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  IAM_id: string;
  IAM_api_key: string;
}

export interface DataStreamSourceGenerationTrainRecord {
  jsondata?: DataStreamSourceGenerationTrainRecordJsonData | null;
  file?: FileReference | null;
  list_of_files?: ListOfFileReferences | null;
  directory?: Directory | null;
  s3files?: S3Files | null;
  data_stream?: "jsondata" | "file" | "list_of_files" | "directory" | "s3files";
}
export interface DataStreamSourceGenerationTrainRecord__Output {
  jsondata?: DataStreamSourceGenerationTrainRecordJsonData__Output | null;
  file?: FileReference__Output | null;
  list_of_files?: ListOfFileReferences__Output | null;
  directory?: Directory__Output | null;
  s3files?: S3Files__Output | null;
  data_stream: "jsondata" | "file" | "list_of_files" | "directory" | "s3files";
}

export interface TuningConfig {
  num_virtual_tokens?: number | string | Long;
  prompt_tuning_init_text?: string;
  prompt_tuning_init_method?: string;
  prompt_tuning_init_source_model?: string;
  output_model_types?: string[];
}
export interface TuningConfig__Output {
  num_virtual_tokens: number;
  prompt_tuning_init_text: string;
  prompt_tuning_init_method: string;
  prompt_tuning_init_source_model: string;
  output_model_types: string[];
}

export interface TextGenerationTaskPeftPromptTuningTrainParameters {
  base_model?: string;
  train_stream?: DataStreamSourceGenerationTrainRecord | null;
  tuning_config?: TuningConfig | null;
  val_stream?: DataStreamSourceGenerationTrainRecord | null;
  device?: string;
  tuning_type?: string;
  num_epochs?: number | string | Long;
  learning_rate?: number | string;
  verbalizer?: string;
  batch_size?: number | string | Long;
  max_source_length?: number | string | Long;
  max_target_length?: number | string | Long;
  accumulate_steps?: number | string | Long;
  torch_dtype?: string;
  silence_progress_bars?: boolean;
  seed?: number | string | Long;
  _val_stream?: "val_stream";
  _device?: "device";
  _tuning_type?: "tuning_type";
  _num_epochs?: "num_epochs";
  _learning_rate?: "learning_rate";
  _verbalizer?: "verbalizer";
  _batch_size?: "batch_size";
  _max_source_length?: "max_source_length";
  _max_target_length?: "max_target_length";
  _accumulate_steps?: "accumulate_steps";
  _torch_dtype?: "torch_dtype";
  _silence_progress_bars?: "silence_progress_bars";
  _seed?: "seed";
}
export interface TextGenerationTaskPeftPromptTuningTrainParameters__Output {
  base_model: string;
  train_stream: DataStreamSourceGenerationTrainRecord__Output | null;
  tuning_config: TuningConfig__Output | null;
  val_stream?: DataStreamSourceGenerationTrainRecord__Output | null;
  device?: string;
  tuning_type?: string;
  num_epochs?: number;
  learning_rate?: number;
  verbalizer?: string;
  batch_size?: number;
  max_source_length?: number;
  max_target_length?: number;
  accumulate_steps?: number;
  torch_dtype?: string;
  silence_progress_bars?: boolean;
  seed?: number;
  _val_stream: "val_stream";
  _device: "device";
  _tuning_type: "tuning_type";
  _num_epochs: "num_epochs";
  _learning_rate: "learning_rate";
  _verbalizer: "verbalizer";
  _batch_size: "batch_size";
  _max_source_length: "max_source_length";
  _max_target_length: "max_target_length";
  _accumulate_steps: "accumulate_steps";
  _torch_dtype: "torch_dtype";
  _silence_progress_bars: "silence_progress_bars";
  _seed: "seed";
}

export interface TextGenerationTaskPeftPromptTuningTrainRequest {
  model_name?: string;
  output_path?: S3Path | null;
  parameters?: TextGenerationTaskPeftPromptTuningTrainParameters | null;
}
export interface TextGenerationTaskPeftPromptTuningTrainRequest__Output {
  model_name: string;
  output_path: S3Path__Output | null;
  parameters: TextGenerationTaskPeftPromptTuningTrainParameters__Output | null;
}

export interface TextGenerationTaskTextGenerationTrainParameters {
  base_model?: string;
  train_stream?: DataStreamSourceGenerationTrainRecord | null;
  torch_dtype?: string;
  max_source_length?: number | string | Long;
  max_target_length?: number | string | Long;
  batch_size?: number | string | Long;
  num_epochs?: number | string | Long;
  accumulate_steps?: number | string | Long;
  random_seed?: number | string | Long;
  lr?: number | string;
  use_iterable_dataset?: boolean;
  _torch_dtype?: "torch_dtype";
  _max_source_length?: "max_source_length";
  _max_target_length?: "max_target_length";
  _batch_size?: "batch_size";
  _num_epochs?: "num_epochs";
  _accumulate_steps?: "accumulate_steps";
  _random_seed?: "random_seed";
  _lr?: "lr";
  _use_iterable_dataset?: "use_iterable_dataset";
}
export interface TextGenerationTaskTextGenerationTrainParameters__Output {
  base_model: string;
  train_stream: DataStreamSourceGenerationTrainRecord__Output | null;
  torch_dtype?: string;
  max_source_length?: number;
  max_target_length?: number;
  batch_size?: number;
  num_epochs?: number;
  accumulate_steps?: number;
  random_seed?: number;
  lr?: number;
  use_iterable_dataset?: boolean;
  _torch_dtype: "torch_dtype";
  _max_source_length: "max_source_length";
  _max_target_length: "max_target_length";
  _batch_size: "batch_size";
  _num_epochs: "num_epochs";
  _accumulate_steps: "accumulate_steps";
  _random_seed: "random_seed";
  _lr: "lr";
  _use_iterable_dataset: "use_iterable_dataset";
}

export interface TextGenerationTaskTextGenerationTrainRequest {
  model_name?: string;
  output_path?: S3Path | null;
  parameters?: TextGenerationTaskTextGenerationTrainParameters | null;
}
export interface TextGenerationTaskTextGenerationTrainRequest__Output {
  model_name: string;
  output_path: S3Path__Output | null;
  parameters: TextGenerationTaskTextGenerationTrainParameters__Output | null;
}

export interface TrainingJob {
  training_id?: string;
  model_name?: string;
}
export interface TrainingJob__Output {
  training_id: string;
  model_name: string;
}

export interface NlpTrainingServiceClient extends grpc.Client {
  TextGenerationTaskPeftPromptTuningTrain(
    argument: TextGenerationTaskPeftPromptTuningTrainRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskPeftPromptTuningTrain(
    argument: TextGenerationTaskPeftPromptTuningTrainRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskPeftPromptTuningTrain(
    argument: TextGenerationTaskPeftPromptTuningTrainRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskPeftPromptTuningTrain(
    argument: TextGenerationTaskPeftPromptTuningTrainRequest,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskPeftPromptTuningTrain(
    argument: TextGenerationTaskPeftPromptTuningTrainRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskPeftPromptTuningTrain(
    argument: TextGenerationTaskPeftPromptTuningTrainRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskPeftPromptTuningTrain(
    argument: TextGenerationTaskPeftPromptTuningTrainRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskPeftPromptTuningTrain(
    argument: TextGenerationTaskPeftPromptTuningTrainRequest,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskTextGenerationTrain(
    argument: TextGenerationTaskTextGenerationTrainRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskTextGenerationTrain(
    argument: TextGenerationTaskTextGenerationTrainRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskTextGenerationTrain(
    argument: TextGenerationTaskTextGenerationTrainRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  TextGenerationTaskTextGenerationTrain(
    argument: TextGenerationTaskTextGenerationTrainRequest,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskTextGenerationTrain(
    argument: TextGenerationTaskTextGenerationTrainRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskTextGenerationTrain(
    argument: TextGenerationTaskTextGenerationTrainRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskTextGenerationTrain(
    argument: TextGenerationTaskTextGenerationTrainRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
  textGenerationTaskTextGenerationTrain(
    argument: TextGenerationTaskTextGenerationTrainRequest,
    callback: grpc.requestCallback<TrainingJob__Output>,
  ): grpc.ClientUnaryCall;
}
export interface NlpTrainingServiceDefinition extends grpc.ServiceDefinition {
  TextGenerationTaskPeftPromptTuningTrain: MethodDefinition<
    TextGenerationTaskPeftPromptTuningTrainRequest,
    TrainingJob,
    TextGenerationTaskPeftPromptTuningTrainRequest__Output,
    TrainingJob__Output
  >;
  TextGenerationTaskTextGenerationTrain: MethodDefinition<
    TextGenerationTaskTextGenerationTrainRequest,
    TrainingJob,
    TextGenerationTaskTextGenerationTrainRequest__Output,
    TrainingJob__Output
  >;
}

export type SubtypeConstructor$1<Constructor extends new (...args: any) => any, Subtype> = new (
  ...args: ConstructorParameters<Constructor>
) => Subtype;
export interface ProtoGrpcType$1 {
  caikit: {
    runtime: {
      Nlp: {
        BidiStreamingTokenClassificationTaskRequest: MessageTypeDefinition;
        DataStreamSourceGenerationTrainRecord: MessageTypeDefinition;
        DataStreamSourceGenerationTrainRecordJsonData: MessageTypeDefinition;
        EmbeddingTaskRequest: MessageTypeDefinition;
        EmbeddingTasksRequest: MessageTypeDefinition;
        NlpService: SubtypeConstructor$1<typeof grpc.Client, NlpServiceClient> & {
          service: NlpServiceDefinition;
        };
        NlpTrainingService: SubtypeConstructor$1<typeof grpc.Client, NlpTrainingServiceClient> & {
          service: NlpTrainingServiceDefinition;
        };
        RerankTaskRequest: MessageTypeDefinition;
        RerankTasksRequest: MessageTypeDefinition;
        SentenceSimilarityTaskRequest: MessageTypeDefinition;
        SentenceSimilarityTasksRequest: MessageTypeDefinition;
        ServerStreamingTextGenerationTaskRequest: MessageTypeDefinition;
        TextClassificationTaskRequest: MessageTypeDefinition;
        TextGenerationTaskPeftPromptTuningTrainParameters: MessageTypeDefinition;
        TextGenerationTaskPeftPromptTuningTrainRequest: MessageTypeDefinition;
        TextGenerationTaskRequest: MessageTypeDefinition;
        TextGenerationTaskTextGenerationTrainParameters: MessageTypeDefinition;
        TextGenerationTaskTextGenerationTrainRequest: MessageTypeDefinition;
        TokenClassificationTaskRequest: MessageTypeDefinition;
        TokenizationTaskRequest: MessageTypeDefinition;
      };
    };
  };
  caikit_data_model: {
    caikit_nlp: {
      EmbeddingResult: MessageTypeDefinition;
      EmbeddingResults: MessageTypeDefinition;
      ExponentialDecayLengthPenalty: MessageTypeDefinition;
      GenerationTrainRecord: MessageTypeDefinition;
      RerankResult: MessageTypeDefinition;
      RerankResults: MessageTypeDefinition;
      RerankScore: MessageTypeDefinition;
      RerankScores: MessageTypeDefinition;
      SentenceSimilarityResult: MessageTypeDefinition;
      SentenceSimilarityResults: MessageTypeDefinition;
      SentenceSimilarityScores: MessageTypeDefinition;
      TuningConfig: MessageTypeDefinition;
    };
    common: {
      BoolSequence: MessageTypeDefinition;
      ConnectionInfo: MessageTypeDefinition;
      ConnectionTlsInfo: MessageTypeDefinition;
      Directory: MessageTypeDefinition;
      File: MessageTypeDefinition;
      FileReference: MessageTypeDefinition;
      FloatSequence: MessageTypeDefinition;
      IntSequence: MessageTypeDefinition;
      ListOfFileReferences: MessageTypeDefinition;
      ListOfVector1D: MessageTypeDefinition;
      NpFloat32Sequence: MessageTypeDefinition;
      NpFloat64Sequence: MessageTypeDefinition;
      ProducerId: MessageTypeDefinition;
      ProducerPriority: MessageTypeDefinition;
      PyFloatSequence: MessageTypeDefinition;
      S3Base: MessageTypeDefinition;
      S3Files: MessageTypeDefinition;
      S3Path: MessageTypeDefinition;
      StrSequence: MessageTypeDefinition;
      TrainingStatus: EnumTypeDefinition;
      Vector1D: MessageTypeDefinition;
    };
    nlp: {
      ClassificationResult: MessageTypeDefinition;
      ClassificationResults: MessageTypeDefinition;
      ClassificationTrainRecord: MessageTypeDefinition;
      ClassifiedGeneratedTextResult: MessageTypeDefinition;
      ClassifiedGeneratedTextStreamResult: MessageTypeDefinition;
      FinishReason: EnumTypeDefinition;
      GeneratedTextResult: MessageTypeDefinition;
      GeneratedTextStreamResult: MessageTypeDefinition;
      GeneratedToken: MessageTypeDefinition;
      InputWarning: MessageTypeDefinition;
      InputWarningReason: EnumTypeDefinition;
      TextGenTokenClassificationResults: MessageTypeDefinition;
      Token: MessageTypeDefinition;
      TokenClassificationResult: MessageTypeDefinition;
      TokenClassificationResults: MessageTypeDefinition;
      TokenClassificationStreamResult: MessageTypeDefinition;
      TokenStreamDetails: MessageTypeDefinition;
      TokenizationResults: MessageTypeDefinition;
      TokenizationStreamResult: MessageTypeDefinition;
    };
    runtime: {
      ModelPointer: MessageTypeDefinition;
      TrainingInfoRequest: MessageTypeDefinition;
      TrainingJob: MessageTypeDefinition;
      TrainingStatusResponse: MessageTypeDefinition;
    };
  };
  google: {
    protobuf: {
      ListValue: MessageTypeDefinition;
      NullValue: EnumTypeDefinition;
      Struct: MessageTypeDefinition;
      Timestamp: MessageTypeDefinition;
      Value: MessageTypeDefinition;
    };
  };
}

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
  Generate(
    argument: BatchedGenerationRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  Generate(
    argument: BatchedGenerationRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  Generate(
    argument: BatchedGenerationRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  Generate(
    argument: BatchedGenerationRequest,
    callback: grpc.requestCallback<BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
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
  GenerateStream(
    argument: SingleGenerationRequest,
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GenerationResponse__Output>;
  GenerateStream(
    argument: SingleGenerationRequest,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GenerationResponse__Output>;
  generateStream(
    argument: SingleGenerationRequest,
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GenerationResponse__Output>;
  generateStream(
    argument: SingleGenerationRequest,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<GenerationResponse__Output>;
  ModelInfo(
    argument: ModelInfoRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  ModelInfo(
    argument: ModelInfoRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  ModelInfo(
    argument: ModelInfoRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  ModelInfo(
    argument: ModelInfoRequest,
    callback: grpc.requestCallback<ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
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
  Tokenize(
    argument: BatchedTokenizeRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  Tokenize(
    argument: BatchedTokenizeRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  Tokenize(
    argument: BatchedTokenizeRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  Tokenize(
    argument: BatchedTokenizeRequest,
    callback: grpc.requestCallback<BatchedTokenizeResponse__Output>,
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
