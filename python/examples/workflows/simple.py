import asyncio
import traceback

from pydantic import BaseModel, ValidationError

from beeai_framework.workflows.workflow import Workflow, WorkflowError


async def main() -> None:
    # State
    class State(BaseModel):
        input: str

    try:
        workflow = Workflow(State)
        workflow.add_step("first", lambda state: print("Running first step!"))
        workflow.add_step("second", lambda state: print("Running second step!"))
        workflow.add_step("third", lambda state: print("Running third step!"))

        await workflow.run(State(input="Hello"))

    except WorkflowError:
        traceback.print_exc()
    except ValidationError:
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
