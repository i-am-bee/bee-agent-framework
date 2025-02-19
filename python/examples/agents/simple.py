import asyncio

from beeai_framework.agents.bee.agent import BeeAgent
from beeai_framework.agents.types import BeeInput, BeeRunInput, BeeRunOutput
from beeai_framework.backend.chat import ChatModel
from beeai_framework.memory.unconstrained_memory import UnconstrainedMemory
from beeai_framework.tools.weather.openmeteo import OpenMeteoTool


async def main() -> None:
    llm = await ChatModel.from_name("ollama:granite3.1-dense:8b")
    agent = BeeAgent(bee_input=BeeInput(llm=llm, tools=[OpenMeteoTool()], memory=UnconstrainedMemory()))

    result: BeeRunOutput = await agent.run(run_input=BeeRunInput(prompt="How is the weather in White Plains?"))

    print(result.result.text)


if __name__ == "__main__":
    asyncio.run(main())
