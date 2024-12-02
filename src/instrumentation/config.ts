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

import { parseEnv } from "@/internals/env.js";
import { z } from "zod";

export const INSTRUMENTATION_ENABLED = parseEnv.asBoolean("BEE_FRAMEWORK_INSTRUMENTATION_ENABLED");
export const INSTRUMENTATION_METRICS_ENABLED = parseEnv.asBoolean(
  "BEE_FRAMEWORK_INSTRUMENTATION_METRICS_ENABLED",
  true,
);

export const INSTRUMENTATION_IGNORED_KEYS = parseEnv(
  "BEE_FRAMEWORK_INSTRUMENTATION_IGNORED_KEYS",
  z.string(),
  "",
)
  .split(",")
  .filter(Boolean);
