/**
 * Copyright 2025 IBM Corp.
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

interface GetIdsProps {
  path: string;
  id: string;
  runId: string;
  parentRunId?: string;
  groupId?: string;
}

export class IdNameManager {
  /** Current index for each event */
  #idNamesCounter = new Map<string, number>();
  /** The new span id names and the original framework emitter event ids dictionary */
  #idNameMap = new Map<string, string>();
  /** We need to map the run tree structure with duplicities to the event tree structure */
  #runIdMap = new Map<string, string>();

  #spanIdGenerator(name: string) {
    const count = this.#idNamesCounter.get(name) || 0;
    this.#idNamesCounter.set(name, count + 1);
    return `${name}-${this.#idNamesCounter.get(name)}`;
  }

  getIds({ path, id, runId, parentRunId, groupId }: GetIdsProps) {
    this.#runIdMap.set(runId, id);
    const spanId = this.#spanIdGenerator(path);

    this.#idNameMap.set(id, spanId);
    const parentSpanId = parentRunId
      ? this.#idNameMap.get(this.#runIdMap.get(parentRunId) || "")
      : groupId;

    return {
      spanId,
      parentSpanId,
    };
  }
}
