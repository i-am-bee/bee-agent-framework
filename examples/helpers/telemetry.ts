import "@opentelemetry/instrumentation/hook.mjs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "bee-agent-framework",
    [ATTR_SERVICE_VERSION]: "0.0.1",
  }),
  traceExporter: new ConsoleSpanExporter(),
});

await sdk.start();
