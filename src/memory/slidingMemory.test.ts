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

import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { verifyDeserialization } from "@tests/e2e/utils.js";
import { SlidingMemory } from "@/memory/slidingMemory.js";

describe("Sliding Memory", () => {
  it("Removes old messages", async () => {
    const instance = new SlidingMemory({
      size: 2,
    });
    await instance.addMany(["A", "B", "C"].map((text) => BaseMessage.of({ role: "user", text })));
    expect(Array.from(instance).map((msg) => msg.text)).toStrictEqual(["B", "C"]);
  });

  it("Removes messages by removalSelector", async () => {
    const instance = new SlidingMemory({
      size: 2,
      handlers: {
        removalSelector: (messages) => messages.find((msg) => msg.role !== "system")!,
      },
    });
    await instance.add(BaseMessage.of({ role: "system", text: "You are a helpful assistant." }));
    await instance.addMany(["A", "B", "C"].map((text) => BaseMessage.of({ role: "user", text })));
    expect(Array.from(instance).map((msg) => msg.text)).toStrictEqual([
      "You are a helpful assistant.",
      "C",
    ]);
  });

  it("Removes multiple messages by removalSelector", async () => {
    const instance = new SlidingMemory({
      size: 5,
      handlers: {
        removalSelector: (messages) => {
          const index = messages.findIndex((msg, index, arr) => {
            const next = arr[index + 1];
            return (
              (msg.role === "user" && next?.role === "assistant") ||
              (msg.role === "assistant" && next?.role === "user")
            );
          });
          if (index === -1) {
            return messages.find((msg) => msg.role === "user")!;
          }
          return [messages[index], messages[index + 1]];
        },
      },
    });
    await instance.addMany(
      ["user", "assistant", "user", "assistant", "user", "user"].map((role, i) =>
        BaseMessage.of({ role, text: `${i + 1}` }),
      ),
    );
    expect(Array.from(instance).map((msg) => msg.text)).toStrictEqual(["3", "4", "5", "6"]);
  });

  it("Serializes", async () => {
    const instance = new SlidingMemory({
      size: 5,
    });
    await instance.add(
      BaseMessage.of({
        text: "Hello!",
        role: Role.USER,
      }),
    );
    const serialized = instance.serialize();
    const deserialized = SlidingMemory.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
