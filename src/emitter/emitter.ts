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

import {
  Callback,
  CleanupFn,
  EmitterOptions,
  EventMeta,
  EventTrace,
  Matcher,
  StringKey,
} from "@/emitter/types.js";
export type { EventMeta, EventTrace, Callback };
import { Cache } from "@/cache/decoratorCache.js";
import { createFullPath, isPath, assertValidName, assertValidNamespace } from "@/emitter/utils.js";
import { EmitterError } from "@/emitter/errors.js";
import { createRandomHash } from "@/internals/helpers/hash.js";
import { shallowCopy, toBoundedFunction } from "@/serializer/utils.js";
import { RequiredAll } from "@/internals/types.js";
import { Serializable } from "@/internals/serializable.js";
import { pick } from "remeda";

export interface EmitterInput<E extends object = object> {
  groupId?: string;
  namespace?: string[];
  creator?: object;
  context?: E & object;
  trace?: EventTrace;
}
export interface EmitterChildInput<E extends object = object> {
  groupId?: string;
  namespace?: string[];
  creator?: object;
  context?: E & object;
  trace?: EventTrace;
}

interface Listener<T = any> {
  readonly match: (event: EventMeta) => boolean;
  readonly raw: Matcher;
  readonly callback: Callback<T>;
  readonly options?: EmitterOptions;
}

export class Emitter<T = Record<keyof any, Callback<unknown>>> extends Serializable {
  protected listeners = new Set<Listener>();
  protected readonly groupId?: string;
  public readonly namespace: string[];
  public readonly creator?: object;
  public readonly context: object;
  public readonly trace?: EventTrace;

  constructor(input: EmitterInput = {}) {
    super();
    this.groupId = input?.groupId;
    this.namespace = input?.namespace ?? [];
    this.creator = input.creator ?? Object.prototype;
    this.context = input?.context ?? {};
    this.trace = input.trace;
    assertValidNamespace(this.namespace);
  }

  static {
    this.register();
  }

  @Cache()
  static get root() {
    return new Emitter<Record<string, Callback<any>>>({ creator: Object.create(null) });
  }

  child<R = T>(input: EmitterChildInput = {}): Emitter<R> {
    const child = new Emitter<R>({
      trace: input.trace ?? this.trace,
      groupId: input?.groupId ?? this.groupId,
      context: { ...this.context, ...input?.context },
      creator: input?.creator ?? this.creator,
      namespace: input?.namespace
        ? [...this.namespace, ...input.namespace]
        : this.namespace.slice(),
    });

    child.pipe(this);
    return child;
  }

  pipe(target: Emitter<any>): CleanupFn {
    return this.on(
      // @ts-expect-error
      "*.*",
      toBoundedFunction(
        // @ts-expect-error
        (...args) => target.invoke(...args),
        [{ value: target, name: "target" }],
      ),
      {
        isBlocking: true,
        once: false,
        persistent: true,
      },
    );
  }

  destroy() {
    this.listeners.clear();
  }

  reset() {
    for (const listener of this.listeners) {
      if (!listener.options?.persistent) {
        this.listeners.delete(listener);
      }
    }
  }

  registerCallbacks<K extends StringKey<RequiredAll<T>>>(
    callbacks: Partial<
      Record<K, NonNullable<T[K]> extends Callback<infer X> ? Callback<X> : never>
    >,
    options?: Partial<Record<K, EmitterOptions>>,
  ): CleanupFn {
    const listeners: CleanupFn[] = [];
    Object.entries(callbacks).forEach(([key, value]) => {
      if (value) {
        // @ts-expect-error
        listeners.push(this.on(key, value, options?.[key]));
      }
    });
    return () => listeners.forEach((cleanup) => cleanup());
  }

  on<K extends StringKey<RequiredAll<T>>>(
    event: K,
    callback: NonNullable<T[K]> extends Callback<any> ? T[K] : never,
    options?: EmitterOptions,
  ): CleanupFn {
    return this.match(event as Matcher, callback as Callback<any>, options);
  }

  match<L>(matcher: Matcher, callback: Callback<L>, options?: EmitterOptions): CleanupFn {
    const listener: Listener = {
      options,
      callback,
      raw: matcher,
      match: (() => {
        if (matcher === "*") {
          return (event) => event.path === createFullPath(this.namespace, event.name);
        } else if (matcher === "*.*") {
          return () => true;
        } else if (matcher instanceof RegExp) {
          return (event) => matcher.test(event.path);
        } else if (typeof matcher === "function") {
          return matcher;
        } else if (typeof matcher === "string") {
          return isPath(matcher)
            ? (event) => event.path === matcher
            : (event) =>
                event.name === matcher && event.path === createFullPath(this.namespace, event.name);
        } else {
          throw new EmitterError("Invalid matcher provided!");
        }
      })(),
    };
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  async emit<K extends StringKey<RequiredAll<T>>>(
    name: K,
    value: NonNullable<T[K]> extends Callback<infer X> ? X : unknown,
  ): Promise<void> {
    assertValidName(name);

    const event = this.createEvent(name);
    return await this.invoke(value, event);
  }

  protected async invoke(data: unknown, event: EventMeta) {
    const executions: unknown[] = [];
    for (const listener of this.listeners.values()) {
      if (!listener.match(event)) {
        continue;
      }

      if (listener.options?.once) {
        this.listeners.delete(listener);
      }

      const run = async () => listener.callback(data, event);
      executions.push(listener.options?.isBlocking ? await run() : run());
    }
    await Promise.all(executions);
  }

  protected createEvent(name: string): EventMeta {
    return {
      id: createRandomHash(),
      groupId: this.groupId,
      name,
      path: createFullPath(this.namespace, name),
      createdAt: new Date(),
      source: this,
      creator: this.creator!,
      context: Object.assign({}, this.context, {}), // TODO: use createInStone
      trace: shallowCopy(this.trace), // TODO
    };
  }

  createSnapshot() {
    return {
      groupId: this.groupId,
      namespace: shallowCopy(this.namespace),
      creator: this.creator,
      context: this.context,
      trace: this.trace,
      listeners: Array.from(this.listeners).map(pick(["raw", "options", "callback"])),
    };
  }

  loadSnapshot({ listeners, ...snapshot }: ReturnType<typeof this.createSnapshot>): void {
    Object.assign(this, snapshot, { listeners: new Set() });
    listeners.forEach(({ raw, callback, options }) => this.match(raw, callback, options));
  }
}
