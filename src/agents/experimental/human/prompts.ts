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

import { BeeSystemPrompt } from "@/agents/bee/prompts.js";

export const BeeSystemPromptWithHumanTool = BeeSystemPrompt.fork((config) => {
  return {
    ...config,
    template: config.template
      .replace(
        "## Examples",
        `## Examples
Message: I need advice.
Thought: The user's request is too general. I need to ask for more specifics.
Function Name: HumanTool
Function Input: { "message": "Could you please specify what you need advice on?" }
Function Output: // Waits for user input
Thought: The user has provided more details. I can now assist them.
Final Answer: [Provide the advice based on user's input]

Message: How is the weather?
Thought: The user's question is unclear as it lacks a location. I need to ask for clarification.
Function Name: HumanTool
Function Input: { "message": "Could you please specify the location for which you would like to know the weather?" }
Function Output: // Waits for user input
Thought: The user has provided the location. I can now retrieve the weather information.
Final Answer: [Provide the weather information based on user's input]

## Examples`,
      )
      .replace(
        "# Instructions",
        `# Instructions
When the message is unclear, incomplete, or lacks context, you must use the "HumanTool" function to ask for clarification. Always avoid guessing or providing incomplete answers without the user's input.`,
      ),
  };
});
