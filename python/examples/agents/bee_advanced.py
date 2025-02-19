# SPDX-License-Identifier: Apache-2.0

import asyncio
import json
import logging
import signal
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from beeai_framework.agents import BeeAgent
from beeai_framework.llms import LLM
from beeai_framework.memory import UnconstrainedMemory
from beeai_framework.tools import OpenMeteoTool, Tool
from beeai_framework.utils import BeeEventEmitter, BeeLogger, MessageEvent

# Load environment variables
load_dotenv()

# Configure logging
logger = BeeLogger("app", level=logging.DEBUG)
event_emitter = BeeEventEmitter()


class DuckDuckGoSearchType:
    STRICT = "STRICT"
    MODERATE = "MODERATE"
    OFF = "OFF"


class DuckDuckGoSearchToolInput(BaseModel):
    query: str = Field(description="The search query.")


class DuckDuckGoSearchTool(Tool):
    """DuckDuckGo search tool implementation"""

    name = "DuckDuckGoSearch"
    description = "Search for information on the web using DuckDuckGo"
    input_schema = DuckDuckGoSearchToolInput

    def __init__(self, max_results: int = 10, safe_search: str = DuckDuckGoSearchType.STRICT) -> None:
        super().__init__()
        self.max_results = max_results
        self.safe_search = safe_search

    def _run(self, input: DuckDuckGoSearchToolInput, _: Any | None = None) -> None:
        try:
            # Ensure input is properly formatted
            if isinstance(input, str):
                input = json.loads(input)

            if not input.query:
                return "Error: No search query provided"

            # Here you would implement the actual DuckDuckGo search
            # For now, return a mock response
            return {
                "results": [
                    {
                        "title": f"Search result for: {input.query}",
                        "link": "https://example.com",
                        "snippet": f"This is a mock search result for the query: {input.query}",
                    }
                ],
                "total": 1,
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e!s}")
            return f"Error parsing search input: {e!s}"
        except Exception as e:
            logger.error(f"Search error: {e!s}")
            return f"Error performing search: {e!s}"


def create_agent() -> BeeAgent:
    """Create and configure the agent with custom tools and prompts"""

    # Initialize LLM
    llm = LLM(
        model="llama3.1",
        parameters={
            "temperature": 0,
            "repeat_penalty": 1.0,
            "num_predict": 2048,
        },
    )

    # Configure tools
    tools = [
        DuckDuckGoSearchTool(max_results=10, safe_search=DuckDuckGoSearchType.STRICT),
        OpenMeteoTool(),
    ]

    # Create agent with custom configuration
    agent = BeeAgent(llm=llm, tools=tools, memory=UnconstrainedMemory())

    return agent


async def handle_tool_response(response: Any, tool_name: str) -> str:
    """Handle tool response and emit appropriate events"""
    try:
        if isinstance(response, dict | list):
            response_str = json.dumps(response, ensure_ascii=False, indent=2)
        else:
            response_str = str(response)

        event_emitter.emit(MessageEvent(source="Agent", message=response_str, state=f"tool_response_{tool_name}"))

        return response_str
    except Exception as e:
        logger.error(f"Error handling tool response: {e!s}")
        event_emitter.emit(MessageEvent(source="Agent", message=str(e), state="error"))
        return str(e)


async def run_agent() -> None:
    """Main function to run the agent"""

    try:
        # Create agent
        agent = create_agent()
        print("Agent initialized with custom tools and prompts. Type 'exit' or 'quit' to end.")

        # Main interaction loop
        while True:
            try:
                # Get user input
                prompt = input("\nUser: ").strip()
                if not prompt:
                    continue

                if prompt.lower() in ["exit", "quit"]:
                    break

                # Emit user message event
                # event_emitter.emit(MessageEvent(source="User", message=prompt))

                # Run agent with timeout
                try:
                    # Set timeout signal
                    signal.alarm(120)  # 2 minutes timeout

                    result = agent.run(
                        prompt=prompt,
                        options={
                            "execution": {
                                "max_retries_per_step": 3,
                                "total_max_retries": 10,
                                "max_iterations": 20,
                            }
                        },
                    )

                    # Handle final response
                    if result:
                        event_emitter.emit(
                            MessageEvent(
                                source="Agent",
                                message=str(result),
                                state="final_answer",
                            )
                        )

                finally:
                    # Clear timeout
                    signal.alarm(0)

            except KeyboardInterrupt:
                print("\nExiting...")
                break
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {e!s}")
                event_emitter.emit(
                    MessageEvent(
                        source="Agent",
                        message=f"Error parsing JSON: {e!s}",
                        state="error",
                    )
                )
            except Exception as e:
                logger.error(f"Error processing prompt: {e!s}")
                event_emitter.emit(MessageEvent(source="Agent", message=str(e), state="error"))

    except Exception as e:
        logger.error(f"Application error: {e!s}")
        event_emitter.emit(MessageEvent(source="Agent", message=str(e), state="error"))


if __name__ == "__main__":
    # Run the async main function
    # logging.basicConfig(level=logging.DEBUG)
    asyncio.run(run_agent())
