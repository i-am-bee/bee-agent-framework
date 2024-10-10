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

import { FrameworkError } from "@/errors.js";
import { Serializable } from "@/internals/serializable.js";
import {
  EventSourceMessage,
  EventStreamContentType,
  fetchEventSource,
} from "@ai-zen/node-fetch-event-source";
import { FetchEventSourceInit } from "@ai-zen/node-fetch-event-source/lib/cjs/fetch.js";
import { emitterToGenerator } from "@/internals/helpers/promise.js";
import { isPlainObject } from "remeda";

export class RestfulClientError extends FrameworkError {}

type URLParamType = string | number | boolean | null | undefined;
export function createURLParams(
  data: Record<string, URLParamType | URLParamType[] | Record<string, any>>,
) {
  const urlTokenParams = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined) {
          urlTokenParams.append(key, String(v));
        }
      });
    } else if (isPlainObject(value)) {
      urlTokenParams.set(key, createURLParams(value).toString());
    } else {
      urlTokenParams.set(key, String(value));
    }
  }
  return urlTokenParams;
}

export class RestfulClient<K extends Record<string, string>> extends Serializable {
  constructor(
    protected input: {
      baseUrl: string;
      headers: () => Promise<Headers>;
      paths: K;
    },
  ) {
    super();
  }

  async *stream(
    path: keyof K,
    init: FetchEventSourceInit,
  ): AsyncGenerator<EventSourceMessage, void, void> {
    const { paths, baseUrl, headers } = this.input;

    const target = new URL(paths[path] ?? path, baseUrl);
    return yield* emitterToGenerator(async ({ emit }) =>
      fetchEventSource(target.toString(), {
        method: "POST",
        headers: await headers().then((raw) => Object.fromEntries(raw.entries())),
        async onopen(response) {
          if (response.ok && response.headers.get("content-type") === EventStreamContentType) {
            return;
          }
          throw new RestfulClientError("Failed to stream!", [], {
            context: {
              url: response.url,
              err: await response.text(),
              response,
            },
            isRetryable: response.status >= 400 && response.status < 500 && response.status !== 429,
          });
        },
        onmessage(msg) {
          if (msg?.event === "error") {
            throw new RestfulClientError(`Error during streaming has occurred.`, [], {
              context: msg,
            });
          }
          emit(msg);
        },
        onclose() {},
        onerror(err) {
          throw new RestfulClientError(`Error during streaming has occurred.`, [err]);
        },
        ...init,
        fetch,
      }),
    );
  }

  async fetch(path: keyof K, init?: RequestInit & { searchParams?: URLSearchParams }) {
    const { paths, baseUrl, headers: getHeaders } = this.input;

    const target = new URL(paths[path] ?? path, baseUrl);
    if (init?.searchParams) {
      for (const [key, value] of init.searchParams) {
        target.searchParams.set(key, value);
      }
    }

    const headers = await getHeaders().then((raw) =>
      Object.assign(Object.fromEntries(raw.entries()), init?.headers),
    );
    const response = await fetch(target.toString(), {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw new RestfulClientError("Fetch has failed", [], {
        context: {
          url: response.url,
          error: await response.text(),
          response,
        },
        isRetryable: [408, 503].includes(response.status ?? 500),
      });
    }

    return response.json();
  }

  createSnapshot() {
    return {
      input: this.input,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    Object.assign(this, snapshot);
  }
}
