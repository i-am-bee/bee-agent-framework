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

import type * as grpc from "@grpc/grpc-js";
import type { EnumTypeDefinition, MessageTypeDefinition } from "@grpc/proto-loader";

import type {
  GenerationServiceClient as _fmaas_GenerationServiceClient,
  GenerationServiceDefinition as _fmaas_GenerationServiceDefinition,
} from "@/adapters/ibm-vllm/types/fmaas/GenerationService.js";

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = new (
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
    GenerationService: SubtypeConstructor<typeof grpc.Client, _fmaas_GenerationServiceClient> & {
      service: _fmaas_GenerationServiceDefinition;
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
