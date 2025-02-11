import { Workflow } from "bee-agent-framework/experimental/workflows/workflow";
import {
  categorizationPromptTemplate,
  competitorsPromptTemplate,
  competitorsSchema,
  findingsSchema,
  reflectionPromptTemplate,
  reflectionSchema,
} from "./prompts.js";
import { State, StateSchema } from "./state.js";
import { deduplicateAndFormatSources, formatSources, getChatLLM, tavilySearch } from "./utils.js";
import { isEmpty, mapValues } from "remeda";
import { AssistantMessage, SystemMessage } from "bee-agent-framework/backend/message";

export enum Steps {
  GENERATE_COMPETITORS = "GENERATE_COMPETITORS",
  SELECT_COMPETITOR = "SELECT_COMPETITOR",
  WEB_RESEARCH = "WEB_RESEARCH",
  CATEGORIZE_FINDINGS = "CATEGORIZE_FINDINGS",
  FINALIZE_SUMMARY = "FINALIZE_SUMMARY",
  REFLECTION = "REFLECTION",
}

async function generateCompetitors(state: State) {
  if (state.specifiedCompetitors?.length) {
    return {
      update: {
        competitors: state.specifiedCompetitors,
        runningSummary: `Competitive analysis of ${state.specifiedCompetitors.join(", ")}`,
        competitorFindings: mapValues(state.specifiedCompetitors, () => []),
      },
    };
  }

  const llm = getChatLLM();
  const result = await llm.createStructure({
    schema: competitorsSchema,
    messages: [
      new SystemMessage(
        competitorsPromptTemplate.render({
          industry: state.industry,
          specifiedCompetitors: undefined,
        }),
      ),
    ],
  });

  return {
    update: {
      competitors: result.object.competitors,
      runningSummary: result.object.overview,
      competitorFindings: mapValues(state.competitors, () => []),
    },
  };
}

async function selectCompetitor(state: State) {
  const unprocessedCompetitors = state.competitors.filter((competitor) =>
    isEmpty(state.competitorFindings[competitor]),
  );

  if (isEmpty(unprocessedCompetitors)) {
    return { next: Steps.FINALIZE_SUMMARY };
  }

  const currentCompetitor = unprocessedCompetitors[0];
  const searchTerms = `${currentCompetitor} comprehensive overview key capabilities`;

  return {
    update: {
      currentCompetitor,
      searchQuery: searchTerms,
    },
    next: Steps.WEB_RESEARCH,
  };
}

async function webResearch(state: State) {
  const searchResults = await tavilySearch(state.searchQuery);
  const searchResultsString = deduplicateAndFormatSources(searchResults, 1000, true);

  return {
    update: {
      sourcesGathered: [...state.sourcesGathered, formatSources(searchResults)],
      researchLoopCount: state.researchLoopCount + 1,
      webResearchResults: [...state.webResearchResults, searchResultsString],
    },
  };
}

async function categorizeFindings(state: State) {
  if (!state.currentCompetitor) {
    throw new Error("No competitor selected for analysis");
  }

  if (state.webResearchResults.length === 0) {
    throw new Error("No research results available for analysis");
  }

  const llm = getChatLLM();
  const result = await llm.createStructure({
    schema: findingsSchema,
    messages: [
      new SystemMessage(
        categorizationPromptTemplate.render({
          competitor: state.currentCompetitor,
          searchResults: state.webResearchResults[state.webResearchResults.length - 1],
        }),
      ),
    ],
  });

  const updatedFindings = {
    ...state.competitorFindings,
    [state.currentCompetitor]: [
      ...(result.object.key_insights || []),
      ...(result.object.unique_capabilities || []),
    ],
  };

  return {
    update: {
      competitorFindings: updatedFindings,
    },
    next: Steps.SELECT_COMPETITOR,
  };
}

async function finalizeSummary(state: State) {
  const competitorSections = Object.entries(state.competitorFindings)
    .map(([competitor, findings]) => {
      return `## ${competitor}\n${findings.map((insight) => `* ${insight}`).join("\n")}`;
    })
    .join("\n\n");

  const finalSummary = `# Competitive Analysis: ${state.industry}

${state.runningSummary || "Comprehensive Competitive Landscape Overview"}

${competitorSections}

### Sources
${state.sourcesGathered.join("\n")}`;

  return {
    update: { answer: new AssistantMessage(finalSummary) },
    next: Steps.REFLECTION,
  };
}

async function reflectAndImprove(state: State) {
  if (!state.answer) {
    throw new Error("No analysis to reflect upon");
  }

  const llm = getChatLLM();
  const result = await llm.createStructure({
    schema: reflectionSchema,
    messages: [
      new SystemMessage(
        reflectionPromptTemplate.render({
          analysis: state.answer.text,
          previous_feedback: state.reflectionFeedback,
        }),
      ),
    ],
  });

  const feedback = [...(result.object.critique || []), ...(result.object.suggestions || [])];

  if (result.object.should_iterate && state.reflectionIteration < state.maxReflectionIterations) {
    return {
      update: {
        reflectionFeedback: feedback,
        reflectionIteration: state.reflectionIteration + 1,
      },
      next: Steps.GENERATE_COMPETITORS,
    };
  }

  const finalAnalysis = new AssistantMessage(
    `${state.answer.text}\n\n## Reflection Notes\n${feedback.map((f) => `* ${f}`).join("\n")}`,
  );

  return {
    update: { answer: finalAnalysis },
    next: Workflow.END,
  };
}

export const workflow = new Workflow({ schema: StateSchema })
  .addStep(Steps.GENERATE_COMPETITORS, generateCompetitors)
  .addStep(Steps.SELECT_COMPETITOR, selectCompetitor)
  .addStep(Steps.WEB_RESEARCH, webResearch)
  .addStep(Steps.CATEGORIZE_FINDINGS, categorizeFindings)
  .addStep(Steps.FINALIZE_SUMMARY, finalizeSummary)
  .addStep(Steps.REFLECTION, reflectAndImprove);
