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

import { isString } from "remeda";
import { Serializer } from "@/serializer/serializer.js";
import {
  VertexAI,
  GenerativeModel,
  ModelParams,
  BaseModelParams as Params,
} from "@google-cloud/vertexai";
import { getPropStrict } from "@/internals/helpers/object.js";
import { GenerateContentResponse } from "@google-cloud/vertexai";

export function processContentResponse(response: GenerateContentResponse): string {
  return (
    response.candidates
      ?.flatMap((candidate) =>
        candidate.content.parts.filter((part) => part.text).map((part) => part.text!),
      )
      .join() || "Empty"
  );
}

export function getTokenCount(response: GenerateContentResponse): number {
  return response.usageMetadata?.totalTokenCount ?? Infinity;
}

export function registerVertexAI() {
  Serializer.register(VertexAI, {
    toPlain: (value) => ({
      project: getPropStrict(value, "project"),
      location: getPropStrict(value, "location"),
    }),
    fromPlain: (value) => {
      return new VertexAI({ project: value.project, location: value.location });
    },
  });
}

export function createModel(
  client: VertexAI,
  modelId: string,
  schema?: string | Record<string, any>,
  params?: Params,
): GenerativeModel {
  const modelParams: ModelParams = { model: modelId, ...params };
  if (schema) {
    const schemaJson = isString(schema) ? JSON.parse(schema) : schema;
    modelParams.generationConfig = {
      ...modelParams.generationConfig,
      responseSchema: schemaJson,
      responseMimeType: "application/json",
    };
  }
  return client.getGenerativeModel(modelParams);
}
