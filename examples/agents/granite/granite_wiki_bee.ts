import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { z } from "zod";
import * as process from "node:process";
import { OllamaLLM } from "bee-agent-framework/adapters/ollama/llm";
import { SimilarityTool } from "bee-agent-framework/tools/similarity";
import { cosineSimilarityMatrix } from "bee-agent-framework/internals/helpers/math";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { splitString } from "bee-agent-framework/internals/helpers/string";
import { AnyTool } from "bee-agent-framework/tools/base";
import pc from "picocolors";
import fs from "node:fs";

// Creates a wikipedia tool that supports information retrieval
function wikipediaRetrivalTool(passageSize: number, overlap: number, maxResults: number): AnyTool {
  // LLM to perform text embedding
  const embeddingLLM = new OllamaLLM({
    modelId: "nomic-embed-text",
  });

  // Estimate of character per LLM token
  const charsPerToken = 4;

  // Similarity tool to calculate the similarity between a query and a set of wikipedia passages
  const similarity = new SimilarityTool({
    maxResults: maxResults,
    provider: async (input): Promise<{ score: number }[]> => {
      const embeds = await embeddingLLM.embed([
        input.query,
        ...input.documents.map((doc) => doc.text),
      ]);
      const similarities = cosineSimilarityMatrix(
        [embeds.embeddings[0]], // Query
        embeds.embeddings.slice(1), // Documents
      )[0];
      if (!similarities) {
        throw new Error("Missing similarities");
      }
      return similarities.map((score) => ({ score }));
    },
  });

  const wikipedia = new WikipediaTool();
  // The wikipedia tool is extended to support chunking and similarity calculations
  return wikipedia
    .extend(
      z.object({
        page: z
          .string()
          .describe("The Wikipedia page to search e.g 'New York'. This field is required.")
          .min(1)
          .max(128),
        query: z
          .string()
          .describe(
            "A specific search query to lookup within the wikipedia the page. Use a descriptive phrase or sentence. This field is required.",
          ),
      }),
      (newInput) => ({ query: newInput.page }),
    )
    .pipe(similarity, (input, output) => ({
      query: input.query,
      documents: output.results.flatMap((document) =>
        Array.from(
          splitString(document.fields.markdown as string, {
            size: passageSize * charsPerToken,
            overlap: overlap * charsPerToken,
          }),
        ).map((chunk) => ({
          text: chunk,
        })),
      ),
    }));
}

function getPrompt(fallback: string) {
  if (process.stdin.isTTY) {
    return fallback;
  }
  return fs.readFileSync(process.stdin.fd).toString().trim() || fallback;
}

// Agent LLM
const llm = new OllamaChatLLM({
  modelId: "granite3-dense:8b",
  parameters: {
    temperature: 0,
    num_ctx: 4096,
    num_predict: 512,
  },
});

const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [wikipediaRetrivalTool(200, 50, 3)],
});

try {
  const prompt = getPrompt(
    `Who were the authors of the paper 'Attention is all you need' and how many citations does it have?`,
  );
  console.log(pc.blue(`User 👤:`), prompt);
  const response = await agent
    .run(
      { prompt },
      {
        execution: {
          maxIterations: 8,
          maxRetriesPerStep: 3,
          totalMaxRetries: 3,
        },
      },
    )
    .observe((emitter) => {
      emitter.on("update", (data) => {
        console.log(pc.gray(`Agent 🤖 (${data.update.key}): ${data.update.value.trim()}`));
      });
    });
  console.log(pc.red(`Agent 🤖:`), response.result.text);
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
}