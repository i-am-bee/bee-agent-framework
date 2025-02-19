from beeai_framework.agents.runners.default.prompts import (
    SystemPromptTemplate,
    SystemPromptTemplateInput,
    ToolDefinition,
)
from beeai_framework.tools.weather.openmeteo import OpenMeteoTool

tool = OpenMeteoTool()

# Render the granite system prompt
prompt = SystemPromptTemplate.render(
    SystemPromptTemplateInput(
        instructions="You are a helpful AI assistant!", tools=[ToolDefinition(**tool.prompt_data())], tools_length=1
    )
)

print(prompt)
