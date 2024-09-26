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

import { z, ZodSchema } from "zod";
import { setProp } from "@/internals/helpers/object.js";
import { ValueError } from "@/errors.js";
import { Serializable } from "@/internals/serializable.js";
import { JSONParser } from "@streamparser/json";
import { jsonrepairTransform } from "jsonrepair/stream";
import { Cache, SingletonCacheKeyFn } from "@/cache/decoratorCache.js";
import { shallowCopy } from "@/serializer/utils.js";

export abstract class ParserField<T, TPartial> extends Serializable {
  public raw = "";

  abstract get(): T;
  abstract getPartial(): TPartial;

  write(chunk: string) {
    this.raw += chunk;
  }

  async end() {}

  createSnapshot() {
    return { raw: this.raw };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}

export class ZodParserField<T extends ZodSchema> extends ParserField<z.output<T>, string> {
  static {
    this.register();
  }

  constructor(protected readonly schema: T) {
    super();
  }

  get() {
    return this.schema.parse(this.raw);
  }

  getPartial() {
    return this.raw;
  }

  createSnapshot() {
    return { ...super.createSnapshot(), schema: this.schema };
  }
}

export class JSONParserField<T extends ZodSchema> extends ParserField<
  z.output<T>,
  Partial<z.output<T>>
> {
  protected stream!: ReturnType<typeof jsonrepairTransform>;
  protected jsonParser!: JSONParser;
  protected ref!: { value: z.output<T> };

  constructor(protected readonly input: { schema: T; base: Partial<z.output<T>> }) {
    super();
    if (input.base === undefined) {
      throw new ValueError(`Base must be defined!`);
    }
    this.init();
  }

  @Cache({ cacheKey: SingletonCacheKeyFn })
  protected init() {
    this.ref = { value: shallowCopy(this.input.base) };
    this.jsonParser = new JSONParser({ emitPartialTokens: false, emitPartialValues: true });
    this.stream = jsonrepairTransform();
    this.stream.on("data", (chunk) => {
      this.jsonParser.write(chunk.toString());
    });
    this.jsonParser.onValue = ({ value, key, stack }) => {
      const keys = stack
        .map((s) => s.key)
        .concat(key)
        .filter((s) => s !== undefined)
        .map(String);

      if (keys.length === 0 && value === undefined) {
        return;
      }
      const prefix: keyof typeof this.ref = "value";
      setProp(this.ref, [prefix, ...keys], value);
    };
  }

  write(chunk: string) {
    super.write(chunk);
    this.stream.push(chunk);
  }

  get() {
    return this.input.schema.parse(this.ref.value);
  }

  getPartial() {
    return this.ref.value;
  }

  async end() {
    if (this.stream.closed || this.jsonParser.isEnded) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.jsonParser.onEnd = resolve;
      this.jsonParser.onError = reject;

      this.stream.push(null);
      this.jsonParser.end();
    });
  }

  createSnapshot() {
    return { ...super.createSnapshot(), input: this.input };
  }

  loadSnapshot({ raw, ...snapshot }: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, { raw: "", ...snapshot });
    this.init();
    this.write(raw);
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ParserField {
  export type inferValue<T> = T extends ParserField<infer L, any> ? L : never;
  export type inferPartialValue<T> = T extends ParserField<any, infer L> ? L : never;
}
