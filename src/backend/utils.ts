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

import { ValueError } from "@/errors.js";
import { BackendProvider } from "@/backend/provider.js";
import { ClassConstructor } from "@/internals/types.js";
import { BackendProviders, ProviderDef, ProviderName } from "@/backend/constants.js";

export type FullModelName = `${ProviderName}:${string}`;

function findProviderDef(value: string): ProviderDef | null {
  return (
    Object.values(BackendProviders).find((p) => p.name === value || p.module === value) ?? null
  );
}

export function parseModel(name: string) {
  const [providerId, modelId] = name.split(":") as [ProviderName, string];
  const providerDef = findProviderDef(providerId);
  if (!providerDef) {
    throw new ValueError("Model does not contain provider name!");
  }
  return { providerId, modelId, providerDef };
}

export async function loadProvider(
  name: ProviderName | FullModelName,
  options?: Record<string, any>,
) {
  const { providerDef } = parseModel(name);
  const module = await import(
    `bee-agent-framework/adapters/${providerDef.module}/backend/provider`
  );
  const TargetClass: ClassConstructor<BackendProvider> = module[`${providerDef.name}Provider`];
  return new TargetClass(options);
}
