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
  ClientOptions as GRPCClientOptions,
  ClientReadableStream,
  ClientUnaryCall,
  Metadata,
} from "@grpc/grpc-js";

import * as R from "remeda";
// eslint-disable-next-line no-restricted-imports
import { UnaryCallback } from "@grpc/grpc-js/build/src/client.js";
import { FrameworkError, ValueError } from "@/errors.js";
import protoLoader, { Options } from "@grpc/proto-loader";

import {
  BatchedGenerationRequest,
  BatchedGenerationResponse__Output,
  BatchedTokenizeRequest,
  BatchedTokenizeResponse__Output,
  type EmbeddingTasksRequest,
  GenerationRequest__Output,
  ModelInfoRequest,
  ModelInfoResponse__Output,
  ProtoGrpcType as GenerationProtoGentypes,
  ProtoGrpcType$1 as CaikitProtoGentypes,
  SingleGenerationRequest,
  EmbeddingResults__Output,
  type SubtypeConstructor,
} from "@/adapters/ibm-vllm/types.js";
import { parseEnv } from "@/internals/env.js";
import { z } from "zod";
import { Cache } from "@/cache/decoratorCache.js";
import { Serializable } from "@/internals/serializable.js";
import PQueue from "p-queue-compat";
import { getProp } from "@/internals/helpers/object.js";

const GENERATION_PROTO_PATH = new URL("./proto/generation.proto", import.meta.url);
const NLP_PROTO_PATH = new URL("./proto/caikit_runtime_Nlp.proto", import.meta.url);

interface ClientOptions {
  modelRouterSubdomain?: string;
  url: string;
  credentials: {
    rootCert: string;
    certChain: string;
    privateKey: string;
  };
  grpcClientOptions: GRPCClientOptions;
  clientShutdownDelay: number;
  limits?: {
    concurrency?: {
      embeddings?: number;
    };
  };
}

const defaultOptions = {
  clientShutdownDelay: 5 * 60 * 1000,
  grpcClientOptions: {
    // This is needed, otherwise communication to DIPC cluster fails with "Dropped connection" error after +- 50 secs
    "grpc.keepalive_time_ms": 25000,
    "grpc.max_receive_message_length": 32 * 1024 * 1024, // 32MiB
  },
};

const grpcConfig: Options = {
  longs: Number,
  enums: String,
  arrays: true,
  objects: true,
  oneofs: true,
  keepCase: true,
  defaults: true,
};

const generationPackage = grpc.loadPackageDefinition(
  protoLoader.loadSync([GENERATION_PROTO_PATH.pathname], grpcConfig),
) as unknown as GenerationProtoGentypes;

const embeddingsPackage = grpc.loadPackageDefinition(
  protoLoader.loadSync([NLP_PROTO_PATH.pathname], grpcConfig),
) as unknown as CaikitProtoGentypes;

const GRPC_CLIENT_TTL = 15 * 60 * 1000;

type CallOptions = GRPCCallOptions & { signal?: AbortSignal };
type RequiredModel<T> = T & { model_id: string };

export class Client extends Serializable {
  public readonly options: ClientOptions;
  private usedDefaultCredentials = false;

  @Cache({ ttl: GRPC_CLIENT_TTL })
  protected getClient<T extends { close: () => void }>(
    modelId: string,
    factory: SubtypeConstructor<typeof grpc.Client, T>,
  ): T {
    const modelSpecificUrl = this.options.url.replace(/{model_id}/, modelId.replaceAll("/", "--"));
    const client = new factory(
      modelSpecificUrl,
      grpc.credentials.createSsl(
        Buffer.from(this.options.credentials.rootCert),
        Buffer.from(this.options.credentials.privateKey),
        Buffer.from(this.options.credentials.certChain),
      ),
      this.options.grpcClientOptions,
    );
    setTimeout(() => {
      try {
        client.close();
      } catch {
        /* empty */
      }
    }, GRPC_CLIENT_TTL + this.options.clientShutdownDelay).unref();
    return client;
  }

  protected getDefaultCredentials() {
    this.usedDefaultCredentials = true;
    return {
      rootCert: parseEnv("IBM_VLLM_ROOT_CERT", z.string()),
      privateKey: parseEnv("IBM_VLLM_PRIVATE_KEY", z.string()),
      certChain: parseEnv("IBM_VLLM_CERT_CHAIN", z.string()),
    };
  }

  constructor(options?: Partial<ClientOptions>) {
    super();
    this.options = {
      ...defaultOptions,
      ...options,
      url: options?.url ?? parseEnv("IBM_VLLM_URL", z.string()),
      credentials: options?.credentials ?? this.getDefaultCredentials(),
    };
  }

  async modelInfo(request: RequiredModel<ModelInfoRequest>, options?: CallOptions) {
    const client = this.getClient(request.model_id, generationPackage.fmaas.GenerationService);
    return this.wrapGrpcCall<ModelInfoRequest, ModelInfoResponse__Output>(
      client.modelInfo.bind(client),
    )(request, options);
  }

  async generate(request: RequiredModel<BatchedGenerationRequest>, options?: CallOptions) {
    const client = this.getClient(request.model_id, generationPackage.fmaas.GenerationService);
    return this.wrapGrpcCall<BatchedGenerationRequest, BatchedGenerationResponse__Output>(
      client.generate.bind(client),
    )(request, options);
  }

  async generateStream(request: RequiredModel<SingleGenerationRequest>, options?: CallOptions) {
    const client = this.getClient(request.model_id, generationPackage.fmaas.GenerationService);
    return this.wrapGrpcStream<SingleGenerationRequest, GenerationRequest__Output>(
      client.generateStream.bind(client),
    )(request, options);
  }

  async tokenize(request: RequiredModel<BatchedTokenizeRequest>, options?: CallOptions) {
    const client = this.getClient(request.model_id, generationPackage.fmaas.GenerationService);
    return this.wrapGrpcCall<BatchedTokenizeRequest, BatchedTokenizeResponse__Output>(
      client.tokenize.bind(client),
    )(request, options);
  }

  async embed(request: RequiredModel<EmbeddingTasksRequest>, options?: CallOptions) {
    const client = this.getClient(
      request.model_id,
      embeddingsPackage.caikit.runtime.Nlp.NlpService,
    );
    return this.queues.embeddings.add(
      () =>
        this.wrapGrpcCall<EmbeddingTasksRequest, EmbeddingResults__Output>(
          client.embeddingTasksPredict.bind(client),
        )(request, options),
      { throwOnTimeout: true },
    );
  }

  protected wrapGrpcCall<TRequest, TResponse>(
    fn: (
      request: TRequest,
      metadata: Metadata,
      options: CallOptions,
      callback: UnaryCallback<TResponse>,
    ) => ClientUnaryCall,
  ) {
    return (request: TRequest, { signal, ...options }: CallOptions = {}): Promise<TResponse> => {
      const metadata = new Metadata();
      const modelId = getProp(request, ["model_id"]);
      if (modelId) {
        metadata.add("mm-model-id", modelId);
      }

      return new Promise<TResponse>((resolve, reject) => {
        const call = fn(request, metadata, options, (err, response) => {
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

  createSnapshot() {
    if (!this.usedDefaultCredentials) {
      throw new ValueError(
        "Cannot serialize a client with credentials passed directly. Use environment variables.",
      );
    }
    return {
      options: R.omit(this.options, ["credentials"]),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
    this.options.credentials = this.getDefaultCredentials();
  }

  @Cache({ enumerable: false })
  protected get queues() {
    return {
      embeddings: new PQueue({
        concurrency: this.options.limits?.concurrency?.embeddings ?? 5,
        throwOnTimeout: true,
      }),
    };
  }
}
