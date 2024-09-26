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
import { Emitter } from "@/emitter/emitter.js";
import { entries } from "remeda";
import { FrameworkError, ValueError } from "@/errors.js";
import { Serializable } from "@/internals/serializable.js";
import { shallowCopy } from "@/serializer/utils.js";
import { Cache } from "@/cache/decoratorCache.js";
import { ParserField } from "@/agents/parsers/field.js";
import { Callback, InferCallbackValue } from "@/emitter/types.js";

export interface ParserNode<T extends string, P extends ParserField<any, any>> {
  prefix: string;
  next: readonly T[];
  isStart?: boolean;
  isEnd?: boolean;
  field: P;
}

type StringKey<T extends NonNullable<unknown>> = Extract<keyof T, string>;

interface Callbacks<T extends Record<string, ParserNode<StringKey<T>, ParserField<any, any>>>> {
  update: Callback<
    {
      [K in StringKey<T>]: {
        key: K;
        value: ParserField.inferValue<T[K]["field"]>;
        field: T[K]["field"];
      };
    }[StringKey<T>]
  >;
  partialUpdate: Callback<
    {
      [K in StringKey<T>]: {
        key: K;
        delta: string;
        value: ParserField.inferPartialValue<T[K]["field"]>;
        field: T[K]["field"];
      };
    }[StringKey<T>]
  >;
}

interface Line {
  value: string;
  newLine: boolean;
}

const NEW_LINE_CHARACTER = "\n" as const;

export class LinePrefixParserError extends FrameworkError {
  isFatal = true;
  isRetryable = false;
}

interface ExtractedLine<T extends NonNullable<unknown>> {
  key: StringKey<T>;
  value: string;
  partial: boolean;
}

const trimLeftSpaces = (value: string) => value.replace(/^\s*/g, "");

export class LinePrefixParser<
  T extends Record<string, ParserNode<Extract<keyof T, string>, ParserField<any, any>>>,
> extends Serializable {
  public readonly emitter = new Emitter<Callbacks<T>>({
    creator: this,
    namespace: ["agent", "parser", "line"],
  });

  protected readonly lines: Line[] = [];
  protected done = false;
  protected lastNodeKey: StringKey<T> | null = null;

  public readonly finalState = {} as LinePrefixParser.inferOutput<T>;
  public readonly partialState = {} as Partial<Record<StringKey<T>, string>>;

  get isDone() {
    return this.done;
  }

  constructor(protected readonly nodes: T) {
    super();

    let hasStartNode = false;
    let hasEndNode = false;

    for (const [key, { next, isStart, isEnd }] of entries(nodes ?? {})) {
      hasStartNode = Boolean(hasStartNode || isStart);
      hasEndNode = Boolean(hasEndNode || isEnd);

      for (const nextKey of next) {
        if (key === nextKey) {
          throw new ValueError(`Node '${key}' cannot point to itself.`);
        }
        if (!(nextKey in nodes)) {
          throw new ValueError(
            `Node '${key}' contains a transition to non-existing node '${nextKey}'.`,
          );
        }
      }
    }

    if (!hasStartNode) {
      throw new ValueError(`At least one start node must be provided!`);
    }
    if (!hasEndNode) {
      throw new ValueError(`At least one end node must be provided!`);
    }
  }

  async add(chunk: string) {
    if (!chunk || this.done) {
      return;
    }

    chunk.split(NEW_LINE_CHARACTER).forEach((line, i, arr) => {
      const isFirstLine = i === 0;

      if (isFirstLine) {
        if (this.lines.length === 0) {
          this.lines.push({ newLine: false, value: line });
        } else {
          this.lines.at(-1)!.value += line;
        }
      } else {
        this.lines.push({ newLine: arr.length > 1, value: line });
      }
    });

    while (this.lines.length > 0) {
      const line = this.lines[0];
      const isLastLine = this.lines.length === 1;

      const parsedLine = this.extractLine(line.value);
      if (isLastLine && (parsedLine?.partial || !line.value)) {
        break;
      }
      this.lines.shift();

      if (parsedLine && !parsedLine.partial) {
        if (this.lastNodeKey) {
          const lastNode = this.nodes[this.lastNodeKey];
          if (!lastNode.next.includes(parsedLine.key)) {
            console.info({ parsedLine, line, x: this.partialState });
            throw new LinePrefixParserError(
              `Transition from '${this.lastNodeKey}' to '${parsedLine.key}' does not exist!`,
            );
          }

          await this.emitFinalUpdate(this.lastNodeKey, lastNode.field);
        } else if (!this.nodes[parsedLine.key].isStart) {
          throw new LinePrefixParserError(
            `Parsed text line corresponds to a node "${parsedLine.key}" which is not a start node!`,
          );
        }

        const node = this.nodes[parsedLine.key];
        node.field.write(parsedLine.value);
        await this.emitPartialUpdate({
          key: parsedLine.key,
          value: node.field.getPartial(),
          delta: parsedLine.value,
          field: node.field,
        });
        this.lastNodeKey = parsedLine.key;
      } else if (this.lastNodeKey) {
        if (!this.nodes[this.lastNodeKey].field.raw) {
          line.value = trimLeftSpaces(line.value);
        }
        if (line.newLine) {
          line.value = `${NEW_LINE_CHARACTER}${line.value}`;
        }

        const node = this.nodes[this.lastNodeKey];
        node.field.write(line.value);
        await this.emitPartialUpdate({
          key: this.lastNodeKey,
          value: node.field.getPartial(),
          delta: line.value,
          field: node.field,
        });
      }
    }
  }

  async end() {
    if (this.done) {
      return this.finalState;
    }
    this.done = true;

    if (!this.lastNodeKey) {
      throw new LinePrefixParserError("Nothing valid has been parsed yet!");
    }

    const stash = this.lines.reduce(
      (acc, { newLine, value }) => `${acc}${newLine ? NEW_LINE_CHARACTER.concat(value) : value}`,
      "",
    );
    this.lines.length = 0;

    const field = this.nodes[this.lastNodeKey].field!;
    if (stash) {
      field.write(stash);
      await this.emitPartialUpdate({
        key: this.lastNodeKey,
        value: field.getPartial(),
        delta: stash,
        field,
      });
    }
    await this.emitFinalUpdate(this.lastNodeKey, field);

    const currentNode = this.nodes[this.lastNodeKey];
    if (!currentNode.isEnd) {
      throw new LinePrefixParserError(`Node '${this.lastNodeKey}' is not an end node.`);
    }

    await Promise.allSettled(Object.values(this.nodes).map(({ field }) => field.end()));
    return this.finalState;
  }

  protected async emitPartialUpdate(data: InferCallbackValue<Callbacks<T>["partialUpdate"]>) {
    if (data.key in this.finalState) {
      throw new LinePrefixParserError(
        `Cannot update partial event for completed key '${data.key}'`,
      );
    }
    if (!(data.key in this.partialState)) {
      this.partialState[data.key] = "";
    }
    this.partialState[data.key] += data.delta;
    await this.emitter.emit("partialUpdate", data);
  }

  protected async emitFinalUpdate(key: StringKey<T>, field: ParserField<any, any>) {
    if (key in this.finalState) {
      throw new LinePrefixParserError(`Duplicated key '${key}'`);
    }
    const value = field.get();
    this.finalState[key] = value;
    await this.emitter.emit("update", {
      key,
      field,
      value,
    });
  }

  @Cache()
  protected get normalizedNodes() {
    return entries(this.nodes)
      .sort(([_, a], [__, b]) => a.prefix.length - b.prefix.length)
      .map(([key, value]) => {
        return [key, { lowerCasePrefix: value.prefix.toLowerCase(), ref: value }] as const;
      });
  }

  protected extractLine(line: string): ExtractedLine<T> | null {
    const trimmedLine = trimLeftSpaces(line);
    if (!trimmedLine) {
      return null;
    }

    for (const [key, node] of this.normalizedNodes) {
      const partial = node.lowerCasePrefix.length > trimmedLine.length;
      const [a, b] = partial
        ? [node.lowerCasePrefix, trimmedLine]
        : [trimmedLine, node.lowerCasePrefix];

      if (a.toLowerCase().startsWith(b.toLowerCase())) {
        return {
          key: key as StringKey<T>,
          value: partial ? trimmedLine : trimLeftSpaces(a.substring(b.length)),
          partial,
        };
      }
    }
    return null;
  }

  createSnapshot() {
    return {
      nodes: shallowCopy(this.nodes),
      lines: shallowCopy(this.lines),
      emitter: this.emitter,
      done: this.done,
      lastNodeKey: this.lastNodeKey,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    return Object.assign(this, snapshot);
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace LinePrefixParser {
  export type infer<
    T extends Record<string, ParserNode<Extract<keyof T, string>, ParserField<any, any>>>,
  > = {
    [K in StringKey<T>]: T[K]["field"] extends ParserField<infer L, any> ? L : never;
  };

  export type inferOutput<T> =
    T extends LinePrefixParser<infer P> ? LinePrefixParser.infer<P> : never;
}
