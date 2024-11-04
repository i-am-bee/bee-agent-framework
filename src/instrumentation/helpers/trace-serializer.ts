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

const DEFAULT_IGNORE_KEYS = ["emitter", "logger", "tokens", "createdBy", "client"];

export function traceSerializer({ ignored_keys = [] }: { ignored_keys?: string[] }) {
  const mergedIgnoreKeys = new Set([...DEFAULT_IGNORE_KEYS, ...ignored_keys]);

  return (body: object) =>
    JSON.stringify(
      body,
      (() => {
        return (key, value) => {
          // Ignore specific keys, all owned entities and keys starting with underscore
          if (mergedIgnoreKeys.has(key) || key.startsWith("_")) {
            return;
          }

          return value;
        };
      })(),
    );
}
