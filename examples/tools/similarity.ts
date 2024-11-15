import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { SimilarityTool } from "bee-agent-framework/tools/similarity";
import { splitString } from "bee-agent-framework/internals/helpers/string";
import { z } from "zod";

{
  const wikipedia = new WikipediaTool();

  const similarity = new SimilarityTool({
    maxResults: 5,
    provider: async (input) =>
      input.documents.map((document) => ({
        score: document.text
          .toLowerCase()
          .split(" ")
          .reduce((acc, word) => acc + (input.query.toLowerCase().includes(word) ? 1 : 0), 0),
      })),
  });
  const wikipediaWithSimilarity = similarity.wrapTool(
    wikipedia,
    z.object({
      query: z.string().describe("Wikipedia query"),
      question: z.string().describe("The question you are trying to answer."),
    }),
  )({
    toWrappedTool: (input) => ({
      query: input.query,
    }),
    fromWrappedTool: (input, output) => ({
      query: input.question,
      documents: output.results.flatMap((document) =>
        Array.from(
          splitString(document.fields.markdown as string, { size: 1000, overlap: 50 }),
        ).map((chunk) => ({
          text: chunk,
        })),
      ),
    }),
  });

  const response = await wikipediaWithSimilarity.run({
    question: "engine",
    query: "JavaScript",
  });
  console.info(response);
}
