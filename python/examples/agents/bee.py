import asyncio
import json
import logging
import os
from typing import Any

from dotenv import load_dotenv

# Import LangChain's Wikipedia tool from community package
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from pydantic import BaseModel, Field

from beeai_framework.agents.bee.agent import BeeAgent
from beeai_framework.agents.types import BeeInput, BeeRunInput
from beeai_framework.backend.chat import ChatModel
from beeai_framework.emitter.emitter import Emitter
from beeai_framework.emitter.types import EmitterOptions
from beeai_framework.memory.token_memory import TokenMemory
from beeai_framework.tools.tool import StringToolOutput, Tool
from beeai_framework.utils.custom_logger import BeeLogger

# Load environment variables
load_dotenv()

# Configure logging - using DEBUG instead of trace
logger = BeeLogger("app", level=logging.DEBUG)


def get_env_var(key: str, default: str | None = None) -> str:
    """Helper function to get environment variables with defaults"""
    return os.getenv(key, default)


class LangChainWikipediaToolInput(BaseModel):
    query: str = Field(description="The topic or question to search for on Wikipedia.")


class LangChainWikipediaTool(Tool):
    """Adapter class to integrate LangChain's Wikipedia tool with our framework"""

    name = "Wikipedia"
    description = "Search factual and historical information from Wikipedia about given topics."
    input_schema = LangChainWikipediaToolInput

    def __init__(self) -> None:
        super().__init__()
        wikipedia = WikipediaAPIWrapper()
        self.wikipedia = WikipediaQueryRun(api_wrapper=wikipedia)

    def _run(self, input: LangChainWikipediaToolInput, _: Any | None = None) -> None:
        query = input.query
        try:
            result = self.wikipedia.run(query)
            return StringToolOutput(json.dumps(result))
        except Exception as e:
            logger.error(f"Wikipedia search error: {e!s}")
            return f"Error searching Wikipedia: {e!s}"


async def create_agent() -> BeeAgent:
    """Create and configure the agent with tools and LLM"""

    llm = await ChatModel.from_name(
        "ollama:granite3.1-dense:8b",
        # ChatModelParameters(temperature=0, presence_penalty=1.0),
    )

    # Configure tools with LangChain's Wikipedia tool
    # tools = [LangChainWikipediaTool(), OpenMeteoTool()]
    tools = [LangChainWikipediaTool()]

    # Add code interpreter tool if URL is configured
    code_interpreter_url = get_env_var("CODE_INTERPRETER_URL")
    if code_interpreter_url:
        # Note: Python tool implementation would go here
        pass

    # Create agent with memory and tools
    agent = BeeAgent(BeeInput(llm=llm, tools=tools, memory=TokenMemory(llm)))

    return agent


async def process_agent_events(event_data: dict[str, Any] | None, event_meta: dict[str, Any]) -> None:
    """Process agent events and log appropriately"""

    if event_meta.name == "start":
        logger.info("Agent started")
    elif event_meta.name == "error":
        logger.info(f"Agent error: {event_data['error']}")
    elif event_meta.name == "retry":
        logger.info("Agent: retrying the action...")
    elif event_meta.name == "update":
        update = event_data["update"]
        logger.info(f"Agent ({update.get('key')}): {update.get('value')}")
    elif event_meta.name == "finish":
        logger.info("Agent finished")


async def observer(emmitter: Emitter) -> None:
    emmitter.on("*.*", process_agent_events, EmitterOptions(match_nested=True))


async def main() -> None:
    """Main application loop"""

    try:
        # Create agent
        agent = await create_agent()

        # Log code interpreter status if configured
        code_interpreter_url = get_env_var("CODE_INTERPRETER_URL")
        if code_interpreter_url:
            logger.info(
                f"🛠️ System: The code interpreter tool is enabled. Please ensure that it is running on {code_interpreter_url}"  # noqa: E501
            )

        logger.info("Agent initialized with LangChain Wikipedia tool. Type 'exit' or 'quit' to end.")

        # Main interaction loop
        while True:
            try:
                # Get user input
                prompt = input("\nUser: ").strip()
                if not prompt:
                    continue

                if prompt.lower() in ["exit", "quit"]:
                    break

                # Run agent with the prompt
                result = await agent.run(
                    BeeRunInput(
                        prompt=prompt,
                        options={
                            "execution": {
                                "max_retries_per_step": 3,
                                "total_max_retries": 10,
                                "max_iterations": 20,
                            }
                        },
                    )
                ).observe(observer)

                print(f"Received response: {result.result.text}")

            except KeyboardInterrupt:
                logger.info("\nExiting...")
                break
            except Exception as e:
                logger.error(f"Error processing prompt: {e!s}")

    except Exception as e:
        logger.error(f"Application error: {e!s}")


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
