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

import grpc, { Deadline } from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { LRUCache } from "lru-cache";

import { ProtoGrpcType as GenerationProtoGentypes } from "@/adapters/ibm-vllm/types/generation.js";
import { getEnv } from "@/internals/env.js";
import { FrameworkError, ValueError } from "@/errors.js";
import { GenerationServiceClient } from "@/adapters/ibm-vllm/types/fmaas/GenerationService.js";

const DEFAULT_GRPC_CLIENT_TTL = 15 * 60 * 1000;
const DEFAULT_GRPC_CLIENT_SHUTDOWN_TIMEOUT = DEFAULT_GRPC_CLIENT_TTL + 5 * 60 * 1000;

const generationProtoPath = "../proto/generation.proto"; // separate variable to avoid Vite transformation https://vitejs.dev/guide/assets#new-url-url-import-meta-url
const GENERATION_PROTO_PATH = new URL(generationProtoPath, import.meta.url);

const options = {
  // This is needed, otherwise communication to DIPC cluster fails with "Dropped connection" error after +- 50 secs
  "grpc.keepalive_time_ms": 25000,
  "grpc.max_receive_message_length": 32 * 1024 * 1024, // 32MiB
} as const;

interface BuildClientProps {
  cache?: LRUCache<string, GenerationServiceClient>;
  modelRouterSubdomain?: string;
  url?: string;
  credentials?: {
    rootCert: string;
    certChain: string;
    privateKey: string;
  };
  clientShutdownTimeout?: number;
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

const defaultClientCache = new LRUCache<string, GenerationServiceClient>({
  max: 100,
  ttl: DEFAULT_GRPC_CLIENT_TTL,
});

export function buildClient({
  url = getEnv("IBM_VLLM_URL"),
  credentials = {
    rootCert: getEnv("IBM_VLLM_ROOT_CERT"),
    privateKey: getEnv("IBM_VLLM_PRIVATE_KEY"),
    certChain: getEnv("IBM_VLLM_CERT_CHAIN"),
  },
  cache = defaultClientCache,
  clientShutdownTimeout = DEFAULT_GRPC_CLIENT_SHUTDOWN_TIMEOUT,
}: BuildClientProps): GenerationServiceClient {
  if (!credentials.rootCert || !credentials.privateKey || !credentials.certChain) {
    throw new ValueError(
      [
        `IBM vllm GRPC credentials were not provided. Either set them directly or put them in ENV:`,
        `"IBM_VLLM_ROOT_CERT", "IBM_VLLM_PRIVATE_KEY", "IBM_VLLM_CERT_CHAIN"`,
      ].join("\n"),
    );
  }
  if (!url) {
    throw new ValueError(
      `IBM vllm URL was not provided. Either set them directly or put them in ENV: "IBM_VLLM_URL"`,
    );
  }

  return new Proxy(
    {},
    {
      get: (_target, prop: keyof GenerationServiceClient) => {
        return function <
          K extends keyof GenerationServiceClient,
          P extends GenerationServiceClient[K],
        >(...params: Parameters<P>) {
          const firstParam = params?.[0] as Exclude<(typeof params)[0], string | Deadline>;
          const modelId = firstParam?.["model_id"];
          if (!modelId) {
            throw new FrameworkError("model_id must be provided in the first GRPC method argument");
          }
          const modelSpecificUrl = url.replace(/{model_id}/, modelId.replaceAll("/", "--"));
          const createClient = () => {
            const client = new generationPackageObject.fmaas.GenerationService(
              url,
              grpc.credentials.createSsl(
                Buffer.from(credentials.rootCert),
                Buffer.from(credentials.privateKey),
                Buffer.from(credentials.certChain),
              ),
              options,
            );
            setTimeout(() => {
              try {
                cache.delete(modelSpecificUrl);
                client.close();
              } catch {
                /* empty */
              }
            }, clientShutdownTimeout).unref();
            return client;
          };

          let modelSpecificClient: ReturnType<typeof createClient> | undefined =
            cache.get(modelSpecificUrl);
          if (!modelSpecificClient) {
            modelSpecificClient = createClient();
            cache.set(modelSpecificUrl, modelSpecificClient);
          }
          const fn = modelSpecificClient[prop].bind(modelSpecificClient) as (
            ...args: typeof params
          ) => ReturnType<GenerationServiceClient[K]>;
          return fn(...params);
        };
      },
    },
  ) as GenerationServiceClient;
}
