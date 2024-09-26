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

import type * as grpc from "@grpc/grpc-js";
import type { MethodDefinition } from "@grpc/proto-loader";
import type {
  BatchedGenerationRequest as _fmaas_BatchedGenerationRequest,
  BatchedGenerationRequest__Output as _fmaas_BatchedGenerationRequest__Output,
} from "@/adapters/ibm-vllm/types/fmaas/BatchedGenerationRequest.js";
import type {
  BatchedGenerationResponse as _fmaas_BatchedGenerationResponse,
  BatchedGenerationResponse__Output as _fmaas_BatchedGenerationResponse__Output,
} from "@/adapters/ibm-vllm/types/fmaas/BatchedGenerationResponse.js";
import type {
  BatchedTokenizeRequest as _fmaas_BatchedTokenizeRequest,
  BatchedTokenizeRequest__Output as _fmaas_BatchedTokenizeRequest__Output,
} from "@/adapters/ibm-vllm/types/fmaas/BatchedTokenizeRequest.js";
import type {
  BatchedTokenizeResponse as _fmaas_BatchedTokenizeResponse,
  BatchedTokenizeResponse__Output as _fmaas_BatchedTokenizeResponse__Output,
} from "@/adapters/ibm-vllm/types/fmaas/BatchedTokenizeResponse.js";
import type {
  GenerationResponse as _fmaas_GenerationResponse,
  GenerationResponse__Output as _fmaas_GenerationResponse__Output,
} from "@/adapters/ibm-vllm/types/fmaas/GenerationResponse.js";
import type {
  ModelInfoRequest as _fmaas_ModelInfoRequest,
  ModelInfoRequest__Output as _fmaas_ModelInfoRequest__Output,
} from "@/adapters/ibm-vllm/types/fmaas/ModelInfoRequest.js";
import type {
  ModelInfoResponse as _fmaas_ModelInfoResponse,
  ModelInfoResponse__Output as _fmaas_ModelInfoResponse__Output,
} from "@/adapters/ibm-vllm/types/fmaas/ModelInfoResponse.js";
import type {
  SingleGenerationRequest as _fmaas_SingleGenerationRequest,
  SingleGenerationRequest__Output as _fmaas_SingleGenerationRequest__Output,
} from "@/adapters/ibm-vllm/types/fmaas/SingleGenerationRequest.js";

export interface GenerationServiceClient extends grpc.Client {
  Generate(
    argument: _fmaas_BatchedGenerationRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  Generate(
    argument: _fmaas_BatchedGenerationRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<_fmaas_BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  Generate(
    argument: _fmaas_BatchedGenerationRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  Generate(
    argument: _fmaas_BatchedGenerationRequest,
    callback: grpc.requestCallback<_fmaas_BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  generate(
    argument: _fmaas_BatchedGenerationRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  generate(
    argument: _fmaas_BatchedGenerationRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<_fmaas_BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  generate(
    argument: _fmaas_BatchedGenerationRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;
  generate(
    argument: _fmaas_BatchedGenerationRequest,
    callback: grpc.requestCallback<_fmaas_BatchedGenerationResponse__Output>,
  ): grpc.ClientUnaryCall;

  GenerateStream(
    argument: _fmaas_SingleGenerationRequest,
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<_fmaas_GenerationResponse__Output>;
  GenerateStream(
    argument: _fmaas_SingleGenerationRequest,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<_fmaas_GenerationResponse__Output>;
  generateStream(
    argument: _fmaas_SingleGenerationRequest,
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<_fmaas_GenerationResponse__Output>;
  generateStream(
    argument: _fmaas_SingleGenerationRequest,
    options?: grpc.CallOptions,
  ): grpc.ClientReadableStream<_fmaas_GenerationResponse__Output>;

  ModelInfo(
    argument: _fmaas_ModelInfoRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  ModelInfo(
    argument: _fmaas_ModelInfoRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<_fmaas_ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  ModelInfo(
    argument: _fmaas_ModelInfoRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  ModelInfo(
    argument: _fmaas_ModelInfoRequest,
    callback: grpc.requestCallback<_fmaas_ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  modelInfo(
    argument: _fmaas_ModelInfoRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  modelInfo(
    argument: _fmaas_ModelInfoRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<_fmaas_ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  modelInfo(
    argument: _fmaas_ModelInfoRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;
  modelInfo(
    argument: _fmaas_ModelInfoRequest,
    callback: grpc.requestCallback<_fmaas_ModelInfoResponse__Output>,
  ): grpc.ClientUnaryCall;

  Tokenize(
    argument: _fmaas_BatchedTokenizeRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  Tokenize(
    argument: _fmaas_BatchedTokenizeRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<_fmaas_BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  Tokenize(
    argument: _fmaas_BatchedTokenizeRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  Tokenize(
    argument: _fmaas_BatchedTokenizeRequest,
    callback: grpc.requestCallback<_fmaas_BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  tokenize(
    argument: _fmaas_BatchedTokenizeRequest,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  tokenize(
    argument: _fmaas_BatchedTokenizeRequest,
    metadata: grpc.Metadata,
    callback: grpc.requestCallback<_fmaas_BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  tokenize(
    argument: _fmaas_BatchedTokenizeRequest,
    options: grpc.CallOptions,
    callback: grpc.requestCallback<_fmaas_BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
  tokenize(
    argument: _fmaas_BatchedTokenizeRequest,
    callback: grpc.requestCallback<_fmaas_BatchedTokenizeResponse__Output>,
  ): grpc.ClientUnaryCall;
}

export interface GenerationServiceHandlers extends grpc.UntypedServiceImplementation {
  Generate: grpc.handleUnaryCall<
    _fmaas_BatchedGenerationRequest__Output,
    _fmaas_BatchedGenerationResponse
  >;

  GenerateStream: grpc.handleServerStreamingCall<
    _fmaas_SingleGenerationRequest__Output,
    _fmaas_GenerationResponse
  >;

  ModelInfo: grpc.handleUnaryCall<_fmaas_ModelInfoRequest__Output, _fmaas_ModelInfoResponse>;

  Tokenize: grpc.handleUnaryCall<
    _fmaas_BatchedTokenizeRequest__Output,
    _fmaas_BatchedTokenizeResponse
  >;
}

export interface GenerationServiceDefinition extends grpc.ServiceDefinition {
  Generate: MethodDefinition<
    _fmaas_BatchedGenerationRequest,
    _fmaas_BatchedGenerationResponse,
    _fmaas_BatchedGenerationRequest__Output,
    _fmaas_BatchedGenerationResponse__Output
  >;
  GenerateStream: MethodDefinition<
    _fmaas_SingleGenerationRequest,
    _fmaas_GenerationResponse,
    _fmaas_SingleGenerationRequest__Output,
    _fmaas_GenerationResponse__Output
  >;
  ModelInfo: MethodDefinition<
    _fmaas_ModelInfoRequest,
    _fmaas_ModelInfoResponse,
    _fmaas_ModelInfoRequest__Output,
    _fmaas_ModelInfoResponse__Output
  >;
  Tokenize: MethodDefinition<
    _fmaas_BatchedTokenizeRequest,
    _fmaas_BatchedTokenizeResponse,
    _fmaas_BatchedTokenizeRequest__Output,
    _fmaas_BatchedTokenizeResponse__Output
  >;
}
