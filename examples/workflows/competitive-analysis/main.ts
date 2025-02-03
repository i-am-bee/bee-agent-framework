import { createConsoleReader } from "./helpers/reader.js";
import { workflow } from "./workflow.js";
import { InputSchema } from "./state.js";

const reader = createConsoleReader();
for await (const { prompt } of reader) {
  let input;
  try {
    input = JSON.parse(prompt);
    input = InputSchema.parse(input);
  } catch {
    input = { industry: prompt };
  }

  const response = await workflow
    .run({
      ...input,
      competitors: input.specifiedCompetitors || [],
      competitorFindings: {},
      searchQuery: "",
      webResearchResults: [],
      sourcesGathered: [],
      researchLoopCount: 0,
    })
    .observe((emitter) => {
      emitter.on("start", (data) => {
        console.log(`Starting ${data.step} for ${data.run.state.industry}`);
      });
      emitter.on("success", (data) => {
        console.log(`Completed ${data.step}`);
        if (data.run.state.currentCompetitor) {
          console.log(`Analyzed: ${data.run.state.currentCompetitor}`);
        }
      });
      emitter.on("error", (data) => {
        console.error(`Error in ${data.step}: ${data.error}`);
      });
    });

  console.log("\n=== Final Analysis ===\n");
  console.log(response.state.answer!.text);
}
