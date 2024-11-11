# OpenTelemetry Instrumentation in Bee-Agent-Framework

This document provides an overview of the OpenTelemetry instrumentation setup in the Bee-Agent-Framework.
The implementation is designed to [create telemetry spans](https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans) for observability when instrumentation is enabled.

## Overview

OpenTelemetry instrumentation allows you to collect telemetry data, such as traces and metrics, to monitor the performance of your services.
This setup involves creating middleware to handle instrumentation automatically when the `INSTRUMENTATION_ENABLED` flag is active.

## Setting up OpenTelemetry

Follow the official OpenTelemetry [Node.js Getting Started Guide](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/) to initialize and configure OpenTelemetry in your application.

## Instrumentation Configuration

### Environment Variable

Use the environment variable `INSTRUMENTATION_ENABLED` to enable or disable instrumentation.

```bash
# Enable instrumentation
export INSTRUMENTATION_ENABLED=true
# Ignore sensitive keys from collected events data
export INSTRUMENTATION_IGNORED_KEYS="apiToken,accessToken"
```

If `INSTRUMENTATION_ENABLED` is false or unset, the framework will run without instrumentation.

### Implementation

The OpenTelemetry middleware is implemented in the `BaseAgent` class in the `run` method

Here's the code snippet demonstrating this configuration:

```ts
if (INSTRUMENTATION_ENABLED) {
  return run.middleware(createTelemetryMiddleware());
} else {
  return run;
}
```

## Creating Custom Spans

You can manually create spans during the `run` process to track specific parts of the execution. This is useful for adding custom telemetry to enhance observability.

Example of creating a span:

```ts
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("bee-agent-framework");

function exampleFunction() {
  const span = tracer.startSpan("example-function-span");
  try {
    // Your code logic here
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

## Verifying Instrumentation

Once you have enabled the instrumentation, you can view telemetry data using any [compatible OpenTelemetry backend](https://opentelemetry.io/docs/languages/js/exporters/), such as [Jaeger](https://www.jaegertracing.io/), [Zipkin](https://zipkin.io/), [Prometheus](https://prometheus.io/docs/prometheus/latest/feature_flags/#otlp-receiver), etc...
Ensure your OpenTelemetry setup is properly configured to export trace data to your chosen backend.

## Run example

Running the Instrumented Application (`examples/agents/bee_instrumentation.js`) file.

```bash
nvm use

## build the codebase
yarn build

## the telemetry example is run on built js files
yarn start:bee_telemetry
```

## Conclusion

This setup provides basic OpenTelemetry instrumentation with the flexibility to enable or disable it as needed.
By creating custom spans and using `createTelemetryMiddleware`, you can capture detailed telemetry for better observability and performance insights.
