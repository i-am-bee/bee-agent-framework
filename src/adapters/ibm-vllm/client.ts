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

import grpc, {
  CallOptions as GRPCCallOptions,
  ClientOptions,
  ClientReadableStream,
  ClientUnaryCall,
} from "@grpc/grpc-js";
// eslint-disable-next-line no-restricted-imports
import { UnaryCallback } from "@grpc/grpc-js/build/src/client.js";
import { FrameworkError, ValueError } from "@/errors.js";
import protoLoader from "@grpc/proto-loader";

import { ProtoGrpcType as GenerationProtoGentypes } from "@/adapters/ibm-vllm/types/generation.js";
import { parseEnv } from "@/internals/env.js";
import { z } from "zod";
import { BatchedGenerationRequest } from "@/adapters/ibm-vllm/types/fmaas/BatchedGenerationRequest.js";
import { SingleGenerationRequest } from "@/adapters/ibm-vllm/types/fmaas/SingleGenerationRequest.js";
import { ModelInfoRequest } from "@/adapters/ibm-vllm/types/fmaas/ModelInfoRequest.js";
import { ModelInfoResponse__Output } from "@/adapters/ibm-vllm/types/fmaas/ModelInfoResponse.js";
import { BatchedGenerationResponse__Output } from "@/adapters/ibm-vllm/types/fmaas/BatchedGenerationResponse.js";
import { GenerationRequest__Output } from "@/adapters/ibm-vllm/types/fmaas/GenerationRequest.js";
import { BatchedTokenizeRequest } from "@/adapters/ibm-vllm/types/fmaas/BatchedTokenizeRequest.js";
import { BatchedTokenizeResponse__Output } from "@/adapters/ibm-vllm/types/fmaas/BatchedTokenizeResponse.js";
import { Cache } from "@/cache/decoratorCache.js";

const generationProtoPath = "./proto/generation.proto"; // separate variable to avoid Vite transformation https://vitejs.dev/guide/assets#new-url-url-import-meta-url
const GENERATION_PROTO_PATH = new URL(generationProtoPath, import.meta.url);

interface BuildClientProps {
  modelRouterSubdomain?: string;
  url: string;
  credentials: {
    rootCert: string;
    certChain: string;
    privateKey: string;
  };
  grpcClientOptions: ClientOptions;
  clientShutdownDelay: number;
}

const generationPackageObject = grpc.loadPackageDefinition(
  protoLoader.loadSync([GENERATION_PROTO_PATH.pathname], {
    longs: Number,
    enums: String,
    arrays: true,
    objects: true,
    oneofs: true,
    keepCase: true,
    defaults: true,
  }),
) as unknown as GenerationProtoGentypes;

const defaultOptions: BuildClientProps = {
  url: parseEnv("IBM_VLLM_URL", z.string()),
  credentials: {
    rootCert: parseEnv("IBM_VLLM_ROOT_CERT", z.string()),
    privateKey: parseEnv("IBM_VLLM_PRIVATE_KEY", z.string()),
    certChain: parseEnv("IBM_VLLM_CERT_CHAIN", z.string()),
  },
  clientShutdownDelay: 5 * 60 * 1000,
  grpcClientOptions: {
    // This is needed, otherwise communication to DIPC cluster fails with "Dropped connection" error after +- 50 secs
    "grpc.keepalive_time_ms": 25000,
    "grpc.max_receive_message_length": 32 * 1024 * 1024, // 32MiB
  },
};

const GRPC_CLIENT_TTL = 15 * 60 * 1000;

type CallOptions = GRPCCallOptions & { signal?: AbortSignal };
type RequiredModel<T> = T & { model_id: string };

export class Client {
  options: BuildClientProps;

  @Cache({ ttl: GRPC_CLIENT_TTL })
  cachedClientFactory(modelId: string) {
    const options = this.options;
    const modelSpecificUrl = options.url.replace(/{model_id}/, modelId.replaceAll("/", "--"));
    const client = new generationPackageObject.fmaas.GenerationService(
      modelSpecificUrl,
      grpc.credentials.createSsl(
        Buffer.from(options.credentials.rootCert),
        Buffer.from(options.credentials.privateKey),
        Buffer.from(options.credentials.certChain),
      ),
      options.grpcClientOptions,
    );
    setTimeout(() => {
      try {
        client.close();
      } catch {
        /* empty */
      }
    }, GRPC_CLIENT_TTL + options.clientShutdownDelay).unref();
    return client;
  }

  protected getClient(modelId: string) {
    return this.cachedClientFactory(modelId);
  }

  constructor(options?: Partial<BuildClientProps>) {
    this.options = { ...defaultOptions, ...options };
    if (
      !this.options.credentials.rootCert ||
      !this.options.credentials.privateKey ||
      !this.options.credentials.certChain
    ) {
      throw new ValueError(
        [
          `IBM vllm GRPC credentials were not provided. Either set them directly or put them in ENV:`,
          `"IBM_VLLM_ROOT_CERT", "IBM_VLLM_PRIVATE_KEY", "IBM_VLLM_CERT_CHAIN"`,
        ].join("\n"),
      );
    }
    if (!this.options.url) {
      throw new ValueError(
        `IBM vllm URL was not provided. Either set them directly or put them in ENV: "IBM_VLLM_URL"`,
      );
    }
  }

  async modelInfo(request: RequiredModel<ModelInfoRequest>, options?: CallOptions) {
    const client = this.getClient(request.model_id);
    return this.wrapGrpcCall<ModelInfoRequest, ModelInfoResponse__Output>(
      client.modelInfo.bind(client),
    )(request, options);
  }

  async generate(request: RequiredModel<BatchedGenerationRequest>, options?: CallOptions) {
    const client = this.getClient(request.model_id);
    return this.wrapGrpcCall<BatchedGenerationRequest, BatchedGenerationResponse__Output>(
      client.generate.bind(client),
    )(request, options);
  }

  async generateStream(request: RequiredModel<SingleGenerationRequest>, options?: CallOptions) {
    const client = this.getClient(request.model_id);
    return this.wrapGrpcStream<SingleGenerationRequest, GenerationRequest__Output>(
      client.generateStream.bind(client),
    )(request, options);
  }

  async tokenize(request: RequiredModel<BatchedTokenizeRequest>, options?: CallOptions) {
    const client = this.getClient(request.model_id);
    return this.wrapGrpcCall<BatchedTokenizeRequest, BatchedTokenizeResponse__Output>(
      client.tokenize.bind(client),
    )(request, options);
  }

  protected wrapGrpcCall<TRequest, TResponse>(
    fn: (
      request: TRequest,
      options: CallOptions,
      callback: UnaryCallback<TResponse>,
    ) => ClientUnaryCall,
  ) {
    return (request: TRequest, { signal, ...options }: CallOptions = {}): Promise<TResponse> => {
      return new Promise<TResponse>((resolve, reject) => {
        const call = fn(request, options, (err, response) => {
          signal?.removeEventListener("abort", abortHandler);
          if (err) {
            reject(err);
          } else {
            if (response === undefined) {
              reject(new FrameworkError("Invalid response from GRPC server"));
            } else {
              resolve(response);
            }
          }
        });
        const abortHandler = () => call.cancel();
        signal?.addEventListener("abort", abortHandler, { once: true });
      });
    };
  }

  protected wrapGrpcStream<TRequest, TResponse>(
    fn: (request: TRequest, options: CallOptions) => ClientReadableStream<TResponse>,
  ) {
    return async (
      request: TRequest,
      { signal, ...options }: CallOptions = {},
    ): Promise<ClientReadableStream<TResponse>> => {
      const stream = fn(request, options);
      const abortHandler = () => stream.cancel();
      signal?.addEventListener("abort", abortHandler, { once: true });
      stream.addListener("close", () => signal?.removeEventListener("abort", abortHandler));
      return stream;
    };
  }
}
