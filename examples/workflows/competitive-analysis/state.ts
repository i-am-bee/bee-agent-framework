import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { z } from "zod";

export const InputSchema = z.object({
  industry: z.string(),
  specifiedCompetitors: z.array(z.string()).optional(),
});

export const StateSchema = z.object({
  industry: z.string(),
  specifiedCompetitors: z.array(z.string()).optional(),
  competitors: z.array(z.string()),
  searchQuery: z.string(),
  webResearchResults: z.array(z.string()),
  sourcesGathered: z.array(z.string()),
  currentCompetitor: z.string().optional(),
  competitorFindings: z.record(z.string(), z.array(z.string())),
  researchLoopCount: z.number(),
  runningSummary: z.string().optional(),
  answer: z.instanceof(BaseMessage).optional(),
  reflectionFeedback: z.array(z.string()).optional(),
  reflectionIteration: z.number().default(0),
  maxReflectionIterations: z.number().default(3),
});

export type State = z.infer<typeof StateSchema>;
