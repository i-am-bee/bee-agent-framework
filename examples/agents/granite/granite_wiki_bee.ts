import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { z } from "zod";
import * as process from "node:process";
import { OllamaLLM } from "bee-agent-framework/adapters/ollama/llm";
import { SimilarityTool } from "bee-agent-framework/tools/similarity";
import { cosineSimilarityWithMatrix } from "bee-agent-framework/internals/helpers/math";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { splitString } from "bee-agent-framework/internals/helpers/string";
import fs from "node:fs";

function getPrompt(fallback: string) {
  if (process.stdin.isTTY) {
    return fallback;
  }
  return fs.readFileSync(process.stdin.fd).toString().trim() || fallback;
}

// LLM to perform text embedding
const embeddingLLM = new OllamaLLM({
  modelId: "nomic-embed-text",
});

// Agent LLM
const llm = new OllamaChatLLM({
  modelId: "granite3-dense:8b",
  parameters: {
    temperature: 0,
    num_ctx: 4096,
    num_predict: 512,
  },
});

// Similarity tool to calculate the similarity between a query and a set of wikipedia passages
const similarity = new SimilarityTool({
  maxResults: 3,
  provider: async (input): Promise<{ score: number }[]> => {
    const embeds = await embeddingLLM.embed([
      input.query,
      ...input.documents.map((doc) => doc.text),
    ]);
    const similarities = cosineSimilarityWithMatrix(
      embeds.embeddings[0], // Query
      embeds.embeddings.slice(1), // Documents
    );
    if (!similarities) {
      throw new Error("Missing similarities");
    }
    return similarities.map((score) => ({ score }));
  },
});

const charsPerToken = 4;
const wikipedia = new WikipediaTool();
// The wikipedia tool is extended to support chunking and similarity calculations
const wikipediaWithSimilarityTool = wikipedia
  .extend(
    z.object({
      page: z.string().describe("The Wikipedia page to search e.g 'New York'"),
      query: z
        .string()
        .describe(
          "A specific search query to lookup within the wikipedia the page. Use a descriptive phrase or sentence.",
        ),
    }),
    (newInput) => ({ query: newInput.page }),
  )
  .pipe(similarity, (input, output) => ({
    query: input.query,
    documents: output.results.flatMap((document) =>
      Array.from(
        splitString(document.fields.markdown as string, {
          size: 200 * charsPerToken,
          overlap: 50 * charsPerToken,
        }),
      ).map((chunk) => ({
        text: chunk,
      })),
    ),
  }));

const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [wikipediaWithSimilarityTool],
});

try {
  const prompt = getPrompt(
    `Who were the authors of the paper 'Attention is all you need' and how many citations does it have?`,
  );
  console.info(`User 👤 : ${prompt}`);

  const response = await agent
    .run(
      { prompt },
      {
        execution: {
          maxIterations: 8,
          maxRetriesPerStep: 3,
          totalMaxRetries: 0,
        },
      },
    )
    .observe((emitter) => {
      emitter.on("update", (data) => {
        console.info(`Agent 🤖 (${data.update.key}) : ${data.update.value}`);
      });
    });
  console.info(`Agent 🤖 : ${response.result.text}`);
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
} finally {
  process.exit(0);
}
