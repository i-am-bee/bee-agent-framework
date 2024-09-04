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

import { describe, it, expect, vi } from "vitest";
import { CustomTool } from "./custom.js";
import { StringToolOutput } from "./base.js";

const mocks = vi.hoisted(() => {
  return {
    parseCustomTool: vi.fn(),
    executeCustomTool: vi.fn(),
  };
});

vi.mock("@connectrpc/connect", () => ({
  createPromiseClient: vi.fn().mockReturnValue({
    parseCustomTool: mocks.parseCustomTool,
    executeCustomTool: mocks.executeCustomTool,
  }),
}));

describe("CustomTool", () => {
  it("should instantiate correctly", async () => {
    mocks.parseCustomTool.mockResolvedValue({
      response: {
        case: "success",
        value: {
          toolName: "test",
          toolDescription: "A test tool",
          toolInputSchemaJson: `{
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": {
              "a": { "type": "integer" },
              "b": { "type": "string" }
            }
          }`,
        },
      },
    });

    const customTool = await CustomTool.fromSourceCode({ url: "http://localhost" }, "source code");

    expect(customTool.name).toBe("test");
    expect(customTool.description).toBe("A test tool");
    expect(await customTool.inputSchema()).toEqual({
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        a: { type: "integer" },
        b: { type: "string" },
      },
    });
  });

  it("should throw InvalidCustomToolError on parse error", async () => {
    mocks.parseCustomTool.mockResolvedValue({
      response: {
        case: "error",
        value: {
          errorMessages: ["Error parsing tool"],
        },
      },
    });

    await expect(
      CustomTool.fromSourceCode({ url: "http://localhost" }, "source code"),
    ).rejects.toThrow("Error parsing tool");
  });

  it("should run the custom tool", async () => {
    mocks.parseCustomTool.mockResolvedValue({
      response: {
        case: "success",
        value: {
          toolName: "test",
          toolDescription: "A test tool",
          toolInputSchemaJson: `{
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": {
              "a": { "type": "integer" },
              "b": { "type": "string" }
            }
          }`,
        },
      },
    });

    const customTool = await CustomTool.fromSourceCode(
      { url: "http://localhost" },
      "source code",
      "executor-id",
    );

    mocks.executeCustomTool.mockResolvedValue({
      response: {
        case: "success",
        value: {
          toolOutputJson: '{"something": "42"}',
        },
      },
    });

    const result = await customTool.run(
      {
        a: 42,
        b: "test",
      },
      {
        signal: new AbortController().signal,
      },
    );
    expect(result).toBeInstanceOf(StringToolOutput);
    expect(result.getTextContent()).toEqual('{"something": "42"}');
  });

  it("should throw CustomToolExecutionError on execution error", async () => {
    mocks.parseCustomTool.mockResolvedValue({
      response: {
        case: "success",
        value: {
          toolName: "test",
          toolDescription: "A test tool",
          toolInputSchemaJson: `{
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": {
              "a": { "type": "integer" },
              "b": { "type": "string" }
            }
          }`,
        },
      },
    });

    const customTool = await CustomTool.fromSourceCode(
      { url: "http://localhost" },
      "source code",
      "executor-id",
    );

    mocks.executeCustomTool.mockResolvedValue({
      response: {
        case: "error",
        value: {
          stderr: "Error executing tool",
        },
      },
    });

    await expect(
      customTool.run(
        {
          a: 42,
          b: "test",
        },
        {
          signal: new AbortController().signal,
        },
      ),
    ).rejects.toThrow('Tool "test" has occurred an error!');
  });
});
