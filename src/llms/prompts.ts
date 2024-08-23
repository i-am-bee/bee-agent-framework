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

import { PromptTemplate } from "@/template.js";

export const GeneratedStructuredTemplate = new PromptTemplate({
  variables: ["schema"],
  template: `You are a helpful assistant that generates only valid JSON adhering to the following JSON Schema.

\`\`\`
{{schema}}
\`\`\`

IMPORTANT: Every message must be a parsable JSON string without additional output.
`,
});

export const GeneratedStructuredErrorTemplate = new PromptTemplate({
  variables: ["errors", "expected", "received"],
  template: `Generated response does not match the expected schema!
Validation Errors: "{{errors}}"`,
});
