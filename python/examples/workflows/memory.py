import asyncio
import traceback

from pydantic import BaseModel, InstanceOf, ValidationError

from beeai_framework.backend.message import AssistantMessage, UserMessage
from beeai_framework.memory.unconstrained_memory import UnconstrainedMemory
from beeai_framework.workflows.workflow import Workflow, WorkflowError


async def main() -> None:
    # State with memory
    class State(BaseModel):
        memory: InstanceOf[UnconstrainedMemory]
        output: str | None = None

    async def echo(state: State) -> str:
        # Get the last message in memory
        last_message = state.memory.messages[-1]
        state.output = last_message.text[::-1]
        return Workflow.END

    try:
        memory = UnconstrainedMemory()
        workflow = Workflow(State)
        workflow.add_step("echo", echo)

        while True:
            # Add user message to memory
            await memory.add(UserMessage(content=input("User: ")))
            # Run workflow with memory
            response = await workflow.run(State(memory=memory))
            # Add assistant response to memory
            await memory.add(AssistantMessage(content=response.state.output))

            print("Assistant: ", response.state.output)
    except WorkflowError:
        traceback.print_exc()
    except ValidationError:
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
