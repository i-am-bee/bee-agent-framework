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

import { Version } from "@/version.js";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { NodeSDK, metrics, resources } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { INSTRUMENTATION_METRICS_ENABLED } from "./config.js";

let sdkServerRunning = false;

const metricExporter = new OTLPMetricExporter({
  url: "https://bee-collector.apps.fmaas-backend.fmaas.res.ibm.com/v1/metrics",
});

export const metricReader = new metrics.PeriodicExportingMetricReader({
  exporter: metricExporter,
});

export const sdk = new NodeSDK({
  resource: new resources.Resource({
    [ATTR_SERVICE_NAME]: "bee-agent-framework",
    [ATTR_SERVICE_VERSION]: Version,
  }),
  metricReader: metricReader,
});

export function startMetricNodeSdkReader() {
  if (INSTRUMENTATION_METRICS_ENABLED && !sdkServerRunning) {
    sdk.start();
    sdkServerRunning = true;
  }
}
