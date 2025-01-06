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

export function createAbortController(...signals: (AbortSignal | undefined)[]) {
  const controller = new AbortController();
  registerSignals(controller, signals);
  return controller;
}

export function registerSignals(controller: AbortController, signals: (AbortSignal | undefined)[]) {
  signals.forEach((signal) => {
    if (signal?.aborted) {
      controller.abort(signal.reason);
    }

    signal?.addEventListener?.(
      "abort",
      () => {
        controller.abort(signal?.reason);
      },
      {
        once: true,
        signal: controller.signal,
      },
    );
  });
}
