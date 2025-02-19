# SPDX-License-Identifier: Apache-2.0

import asyncio

from beeai import LLM

from beeai_framework.agents.bee import BeeAgent
from beeai_framework.agents.types import BeeInput, BeeRunInput
from beeai_framework.backend.message import UserMessage
from beeai_framework.memory import UnconstrainedMemory


async def main() -> None:
    memory = UnconstrainedMemory()
    await memory.add(UserMessage(content="Who invented wheel and why?"))
    agent = BeeAgent(BeeInput(llm=LLM("ollama/llama3.1"), tools=[], memory=memory))

    result = await agent.run(BeeRunInput())

    print(result.result.text)


if __name__ == "__main__":
    asyncio.run(main())
