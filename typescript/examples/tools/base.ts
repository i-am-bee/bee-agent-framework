import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";

const tool = new OpenMeteoTool();
const result = await tool.run({
  location: { name: "New York" },
  start_date: "2024-10-10",
  end_date: "2024-10-10",
});
console.log(result.getTextContent());
