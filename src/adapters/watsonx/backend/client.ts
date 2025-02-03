/**
 * Copyright 2025 IBM Corp.
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

import { WatsonXAI } from "@ibm-cloud/watsonx-ai";
import { getEnv } from "@/internals/env.js";
import { IamAuthenticator, UserOptions } from "ibm-cloud-sdk-core";

export interface WatsonXClientSettings extends Pick<UserOptions, "authenticator" | "version"> {
  spaceId?: string;
  baseUrl?: string;
  region?: string;
  projectId?: string;
  apiKey?: string;
  headers?: Record<string, any>;
}

export function createWatsonXClient(overrides?: WatsonXClientSettings) {
  const region = overrides?.region || getEnv("WATSONX_REGION");
  const baseUrl =
    overrides?.baseUrl || getEnv("WATSONX_BASE_URL") || `https://${region}.ml.cloud.ibm.com`;

  const projectId = overrides?.projectId || getEnv("WATSONX_PROJECT_ID");
  const spaceId = projectId ? undefined : overrides?.spaceId || getEnv("WATSONX_SPACE_ID");

  const options = {
    baseUrl,
    headers: overrides?.headers,
    region,
    projectId,
    spaceId,
    version: overrides?.version || getEnv("WATSONX_VERSION") || "2024-05-31",
    authenticator:
      overrides?.authenticator || // TODO
      new IamAuthenticator({
        apikey: getEnv("WATSONX_API_KEY", overrides?.apiKey ?? ""),
        url: "https://iam.cloud.ibm.com",
      }),
  };

  const instance = WatsonXAI.newInstance({
    version: options.version,
    serviceUrl: options.baseUrl,
    authenticator: options.authenticator,
  });

  return { instance, options };
}

export type WatsonXClient = ReturnType<typeof createWatsonXClient>;
