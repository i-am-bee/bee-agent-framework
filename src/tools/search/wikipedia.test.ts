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

vitest.mock("wikipedia", () => {
  return {
    default: {
      default: {
        setLang(lang: string) {
          return lang;
        },
        async search(input: string) {
          return {
            results: [{ title: input }],
            suggestion: [],
          };
        },
        async page(title: string) {
          return {
            title,
            content: async () => "Content",
            infobox: async () => ({ text: "Infobox" }),
          };
        },
      },
    },
  };
});

import { verifyDeserialization } from "@tests/e2e/utils.js";
import { WikipediaTool } from "@/tools/search/wikipedia.js";

describe("Wikipedia", () => {
  it("Serializes", async () => {
    const instance = new WikipediaTool({
      extraction: {
        fields: { infobox: {} },
      },
    });
    await instance.run({ query: "Prague" });
    const serialized = instance.serialize();
    const deserialized = WikipediaTool.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
