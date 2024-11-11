///////////////////////////////////////////////////////////////////////////////////////////////////
/////// RUN THIS EXAMPLE VIA `yarn start:telemetry ./examples/tools/instrumentation.ts` ///////////
///////////////////////////////////////////////////////////////////////////////////////////////////
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { Logger } from "bee-agent-framework/logger/logger";

Logger.root.level = "silent"; // disable internal logs
const logger = new Logger({ name: "app", level: "trace" });

const tool = new OpenMeteoTool();
const result = await tool.run({
  location: { name: "New York" },
  start_date: "2024-10-10",
  end_date: "2024-10-10",
});
logger.info(`OpenMeteoTool 🤖 (txt) :  ${result.getTextContent()}`);

// Wait briefly to ensure all telemetry data has been processed
setTimeout(() => {
  logger.info("Process exiting after OpenTelemetry flush.");
}, 5_000); // Adjust the delay as needed
