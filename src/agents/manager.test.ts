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

import { BaseAgentManager } from "@/agents/manager.js";
import { expect } from "vitest";

describe("Agent Manager", () => {
  class AgentManager extends BaseAgentManager<any, any, any> {
    protected _create(overrides: any) {
      return overrides;
    }
  }

  it("Creates", () => {
    const manager = new AgentManager();
    const agents = [{ a: "a" }, { b: "b" }, { c: "c" }];
    for (const agentInput of agents) {
      const agent = manager.create(agentInput);
      expect(agent).toBe(agentInput);
    }
  });

  it("Destroys", () => {
    const manager = new AgentManager();

    const agents = [
      manager.create({
        destroy: vi.fn(),
      }),
      manager.create({
        destroy: vi.fn(),
      }),
    ];

    manager.destroy();
    for (const agent of agents) {
      expect(agent.destroy).toBeCalled();
    }
  });
});
