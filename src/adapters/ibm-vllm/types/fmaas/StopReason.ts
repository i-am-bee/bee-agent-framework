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

// Original file: src/adapters/ibm-vllm/proto/generation.proto

export const StopReason = {
  NOT_FINISHED: "NOT_FINISHED",
  MAX_TOKENS: "MAX_TOKENS",
  EOS_TOKEN: "EOS_TOKEN",
  CANCELLED: "CANCELLED",
  TIME_LIMIT: "TIME_LIMIT",
  STOP_SEQUENCE: "STOP_SEQUENCE",
  TOKEN_LIMIT: "TOKEN_LIMIT",
  ERROR: "ERROR",
} as const;

export type StopReason =
  | "NOT_FINISHED"
  | 0
  | "MAX_TOKENS"
  | 1
  | "EOS_TOKEN"
  | 2
  | "CANCELLED"
  | 3
  | "TIME_LIMIT"
  | 4
  | "STOP_SEQUENCE"
  | 5
  | "TOKEN_LIMIT"
  | 6
  | "ERROR"
  | 7;

export type StopReason__Output = (typeof StopReason)[keyof typeof StopReason];
