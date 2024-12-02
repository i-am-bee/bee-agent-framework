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

import { BeeAgent } from "@/agents/bee/agent.js";
import { ElasticSearchTool } from "@/tools/database/elasticsearch.js";
import { SQLTool } from "@/tools/database/sql.js";
import { GoogleSearchTool } from "@/tools/search/googleSearch.js";
import { OpenMeteoTool } from "@/tools/weather/openMeteo.js";
import { expect, describe } from "vitest";
import { isMeasurementedInstance } from "./opentelemetry.js";
import { DuckDuckGoSearchTool } from "@/tools/search/duckDuckGoSearch.js";
import { WebCrawlerTool } from "@/tools/web/webCrawler.js";
import { ArXivTool } from "@/tools/arxiv.js";
import { CalculatorTool } from "@/tools/calculator.js";
import { LLMTool } from "@/tools/llm.js";
import { OllamaLLM } from "@/adapters/ollama/llm.js";
import { WatsonXLLM } from "@/adapters/watsonx/llm.js";
import { LLM } from "@/llms/llm.js";
import { Emitter } from "@/emitter/emitter.js";
import { GenerateCallbacks, LLMMeta, BaseLLMTokenizeOutput, AsyncStream } from "@/llms/base.js";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";
import { TokenMemory } from "@/memory/tokenMemory.js";
import { GraniteBeeAgent } from "@/agents/granite/agent.js";
import { SlidingCache } from "@/cache/slidingCache.js";

export class CustomLLM extends LLM<any> {
  public readonly emitter = Emitter.root.child<GenerateCallbacks>({
    namespace: ["bam", "llm"],
    creator: this,
  });
  meta(): Promise<LLMMeta> {
    throw new Error("Method not implemented.");
  }
  tokenize(): Promise<BaseLLMTokenizeOutput> {
    throw new Error("Method not implemented.");
  }
  protected _generate(): Promise<any> {
    throw new Error("Method not implemented.");
  }
  protected _stream(): AsyncStream<any, void> {
    throw new Error("Method not implemented.");
  }
}

const llm = new OllamaChatLLM({ modelId: "llama3.1" });
const memory = new TokenMemory({ llm });

describe("opentelemetry", () => {
  describe("isMeasurementedInstance", () => {
    it.each([
      // tool
      new OpenMeteoTool(),
      new GoogleSearchTool({ apiKey: "xx", cseId: "xx", maxResults: 10 }),
      new ElasticSearchTool({ connection: { cloud: { id: "" } } }),
      new SQLTool({ connection: { dialect: "mariadb" }, provider: "mysql" }),
      new DuckDuckGoSearchTool(),
      new OpenMeteoTool(),
      new WebCrawlerTool(),
      new ArXivTool(),
      new CalculatorTool(),
      new LLMTool({ llm: new OllamaLLM({ modelId: "llama3.1" }) }),
      // llm
      new OllamaLLM({ modelId: "llama3.1" }),
      new WatsonXLLM({ modelId: "llama3.1", apiKey: "xx" }),
      new CustomLLM("llama3.1"),
      new OllamaChatLLM({ modelId: "llama3.1" }),
      // agent
      new BeeAgent({ llm, memory, tools: [] }),
      new GraniteBeeAgent({ llm, memory, tools: [] }),
    ])("Should return true for '%s'", (value) => {
      expect(isMeasurementedInstance(value)).toBeTruthy();
    });

    it.each([
      null,
      undefined,
      "",
      0,
      "string",
      {},
      memory,
      new SlidingCache({
        size: 50,
      }),
      new Emitter({
        namespace: ["app"],
        creator: this,
      }),
    ])("Should return false for '%s'", (value) => {
      expect(isMeasurementedInstance(value)).toBeFalsy();
    });
  });
});
