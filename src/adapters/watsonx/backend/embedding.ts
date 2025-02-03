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

import { createWatsonXClient, WatsonXClient } from "@/adapters/watsonx/backend/client.js";
import {
  EmbeddingModel,
  EmbeddingModelInput,
  EmbeddingModelOutput,
  EmbeddingModelEvents,
} from "@/backend/embedding.js";
import { EmbeddingParameters } from "@ibm-cloud/watsonx-ai/dist/watsonx-ai-ml/vml_v1.js";
import { shallowCopy } from "@/serializer/utils.js";
import { Emitter } from "@/emitter/emitter.js";

export class WatsonXEmbeddingModel extends EmbeddingModel {
  protected readonly client: WatsonXClient;
  public readonly emitter: Emitter<EmbeddingModelEvents>;

  get providerId() {
    return "watsonx";
  }

  constructor(
    public readonly modelId: string,
    public readonly parameters?: EmbeddingParameters,
    client?: WatsonXClient,
  ) {
    super();
    this.client = client ?? createWatsonXClient();
    this.emitter = Emitter.root.child({
      namespace: ["backend", "watsonx", "embedding"],
      creator: this,
    });
  }

  protected async _create(input: EmbeddingModelInput): Promise<EmbeddingModelOutput> {
    const response = await this.client.instance.embedText({
      modelId: this.modelId,
      spaceId: this.client.options.spaceId,
      projectId: this.client.options.projectId,
      headers: this.client.options.headers,
      inputs: input.values,
      parameters: {
        return_options: { input_text: true },
        ...this.parameters,
      },
    });

    const embeddings = response.result.results.map((e) => e.embedding);
    const values = response.result.results.map((e, i) => e.input || input.values.at(i)!);

    return {
      embeddings,
      values,
      usage: {
        tokens: response.result.input_token_count,
      },
    };
  }

  createSnapshot() {
    return {
      modelId: this.modelId,
      parameters: shallowCopy(this.parameters),
      client: this.client,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    Object.assign(this, snapshot);
  }
}
