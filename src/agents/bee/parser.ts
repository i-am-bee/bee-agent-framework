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

import * as R from "remeda";
import { FrameworkError } from "@/errors.js";
import { Cache } from "@/cache/decoratorCache.js";
import { halveString } from "@/internals/helpers/string.js";
import { parseBrokenJson } from "@/internals/helpers/schema.js";
import { Emitter } from "@/emitter/emitter.js";
import { NonUndefined } from "@/internals/types.js";
import { sumBy } from "remeda";

export interface BeeOutputParserOptions {
  allowMultiLines: boolean;
  preserveNewLines: boolean;
  trimContent: boolean;
}

interface BeeIterationSerializedResult {
  thought?: string;
  tool_name?: string;
  tool_caption?: string;
  tool_input?: string;
  tool_output?: string;
  final_answer?: string;
}

export interface BeeIterationResult extends Omit<BeeIterationSerializedResult, "tool_input"> {
  tool_input?: unknown;
}

export type BeeIterationToolResult = NonUndefined<BeeIterationResult, "tool_input" | "tool_name">;

export class BeeOutputParserError extends FrameworkError {}

const NEW_LINE_CHARACTER = "\n";

interface Callbacks {
  update: (data: {
    type: "full" | "partial";
    state: BeeIterationResult;
    update: {
      key: keyof BeeIterationResult;
      value: string;
    };
  }) => Promise<void>;
}

class RepetitionChecker {
  protected stash: string[] = [];

  constructor(
    protected readonly size: number,
    protected threshold: number,
  ) {}

  add(chunk: string) {
    if (this.stash.length > this.size) {
      this.stash.shift();
    }
    this.stash.push(chunk);

    const occurrences = sumBy(this.stash, (token) => Number(token === chunk));
    return occurrences >= this.threshold;
  }

  reset() {
    this.stash.length = 0;
  }
}

export class BeeOutputParser {
  public isDone = false;
  protected readonly lines: string[];
  protected lastKeyModified: keyof BeeIterationSerializedResult | null = null;
  public stash: string;
  public readonly emitter = new Emitter<Callbacks>({
    creator: this,
    namespace: ["agent", "bee", "parser"],
  });

  public repetitionChecker = new RepetitionChecker(10, 5);
  protected readonly options: BeeOutputParserOptions;

  protected readonly result: BeeIterationSerializedResult = {
    thought: undefined,
    tool_name: undefined,
    tool_caption: undefined,
    tool_input: undefined,
    tool_output: undefined,
    final_answer: undefined,
  };

  constructor(options?: Partial<BeeOutputParserOptions>) {
    this.options = {
      ...this._defaultOptions,
      ...options,
    };
    this.lines = [];
    this.stash = "";
  }

  async add(chunk: string) {
    if (this.isDone) {
      return;
    }

    chunk = chunk ?? "";

    const isRepeating = this.repetitionChecker.add(chunk);
    if (isRepeating) {
      chunk = NEW_LINE_CHARACTER;
    }

    this.stash += chunk;
    if (!chunk.includes(NEW_LINE_CHARACTER)) {
      return;
    }

    while (this.stash.includes(NEW_LINE_CHARACTER)) {
      this.repetitionChecker.reset();
      this.filterStash();
      const [line, stash = ""] = halveString(this.stash, NEW_LINE_CHARACTER);
      this.stash = stash;

      await this._processChunk(line);
    }

    if (isRepeating) {
      this.isDone = true;
    }
  }

  protected filterStash() {
    this.stash = this.stash.replaceAll("<|eom_id|>", "");
    this.stash = this.stash.replaceAll("<|eot_id|>", "");
    this.stash = this.stash.replaceAll("<|start_header_id|>assistant<|end_header_id|>", "");
    this.stash = this.stash.replaceAll("<|start_header_id|>", "");
    this.stash = this.stash.replaceAll("<|end_header_id|>", "");
    this.stash = this.stash.replaceAll("<|im_start|>", "");
    this.stash = this.stash.replaceAll("<|im_end|>", "");
  }

  async finalize() {
    if (this.stash) {
      await this._processChunk(this.stash);
      this.stash = "";
    }

    if (this.isEmpty()) {
      const response = this.lines.join(NEW_LINE_CHARACTER).concat(this.stash);
      this.lines.length = 0;
      this.stash = "";

      await this.add(`Thought: ${response}${NEW_LINE_CHARACTER}`);
      await this.add(`Final Answer: ${response}${NEW_LINE_CHARACTER}`);
    }
    if (this.result.thought && !this.result.final_answer && !this.result.tool_input) {
      this.stash = "";
      await this.add(`Final Answer: ${this.result.thought}${NEW_LINE_CHARACTER}`);
    }

    if (this.lastKeyModified) {
      const parsed = this.parse();
      await this.emitter.emit("update", {
        type: "full",
        state: parsed,
        update: {
          key: this.lastKeyModified,
          value: this.result[this.lastKeyModified]!,
        },
      });
    }
    this.lastKeyModified = null;
  }

  isEmpty() {
    return R.isEmpty(R.pickBy(this.result, R.isTruthy));
  }

  validate() {
    if (this.isEmpty()) {
      throw new BeeOutputParserError("Nothing valid has been parsed yet!", [], {
        context: {
          raw: this.lines.join(NEW_LINE_CHARACTER),
          stash: this.stash,
        },
      });
    }

    const { final_answer, tool_name, tool_input } = this.parse();
    const context = {
      result: this.parse(),
      stash: this.stash,
    };
    if (!final_answer && !tool_input) {
      if (this.result.tool_input) {
        throw new BeeOutputParserError('Invalid "Tool Input" has been generated.', [], {
          context: {
            toolName: tool_name,
            toolCaption: this.result.tool_caption,
            toolInput: this.result.tool_input,
            ...context,
          },
        });
      }

      throw new BeeOutputParserError('Neither "Final Answer" nor "Tool Call" are present.', [], {
        context,
      });
    }
    if (tool_input && final_answer) {
      throw new BeeOutputParserError('Both "Final Answer" and "Tool Call" are present.', [], {
        context,
      });
    }
  }

  @Cache()
  protected get _defaultOptions(): BeeOutputParserOptions {
    return {
      allowMultiLines: true,
      preserveNewLines: true,
      trimContent: false,
    };
  }

  protected async _processChunk(chunk: string) {
    if (this.isDone) {
      return;
    }

    this.lines.push(chunk);

    let oldChunk = this.lastKeyModified ? this.result[this.lastKeyModified] : "";
    if (!this._extractStepPair(chunk) && this.options.allowMultiLines && this.lastKeyModified) {
      const prev = this.result[this.lastKeyModified] || "";
      const newLine = this.options.preserveNewLines ? NEW_LINE_CHARACTER : "";
      chunk = `${this.lastKeyModified}:${prev}${newLine}${chunk}`;
    }

    const step = this._extractStepPair(chunk);
    if (!step && this.lastKeyModified === null && this.options.allowMultiLines) {
      return;
    }

    if (!step) {
      throw new BeeOutputParserError(`No valid type has been detected in the chunk. (${chunk})}`);
    }

    if (this.lastKeyModified && this.lastKeyModified !== step.type) {
      this.isDone = Boolean(this.result[step.type]);
      if (this.isDone) {
        return;
      }

      const state = this.parse();
      await this.emitter.emit("update", {
        type: "full",
        state,
        update: {
          key: this.lastKeyModified,
          value: this.result[this.lastKeyModified]!,
        },
      });
      oldChunk = this.result[step.type] ?? "";
    }
    this.lastKeyModified = step.type;

    if (step.content) {
      this.result[step.type] = step.content;
      const state = this.parse();
      await this.emitter.emit("update", {
        type: "partial",
        state,
        update: {
          key: step.type,
          value: step.content.replace(oldChunk ?? "", ""),
        },
      });
    }
  }

  parse(): BeeIterationResult {
    const toolInput = parseBrokenJson(this?.result.tool_input?.trim?.(), { pair: ["{", "}"] });
    return R.pickBy(
      Object.assign(
        { ...this.result },
        {
          tool_name: this.result.tool_name,
          tool_input: toolInput ?? undefined,
        },
      ),
      R.isDefined,
    );
  }

  protected _isValidStepType(type?: string | null): type is keyof BeeIterationSerializedResult {
    return Boolean(type && type in this.result);
  }

  protected _extractStepPair(line: string) {
    let [, type, content] = line.match(/\s*([\w|\s]+?)\s*:\s*(.*)/ms) ?? [line, null, null];
    type = type ? type.trim().toLowerCase().replace(" ", "_") : null;

    if (!this._isValidStepType(type)) {
      return null;
    }

    content = content ?? "";
    if (this.options.trimContent) {
      content = content.trim();
    }

    return {
      type,
      content,
    };
  }
}
