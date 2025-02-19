import "@opentelemetry/instrumentation/hook.mjs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { Version } from "beeai-framework/version";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "beeai-framework",
    [ATTR_SERVICE_VERSION]: Version,
  }),
  traceExporter: new ConsoleSpanExporter(),
});

sdk.start();

// eslint-disable-next-line no-undef
process.on("beforeExit", async () => {
  await sdk.shutdown();
});
