import asyncio
from typing import Literal, TypeAlias

from pydantic import BaseModel, ValidationError

from beeai_framework.workflows.workflow import Workflow, WorkflowError, WorkflowReservedStepName


async def main() -> None:
    # State
    class State(BaseModel):
        x: int
        y: int
        abs_repetitions: int | None = None
        result: int | None = None

    WorkflowStep: TypeAlias = Literal["pre_process", "add_loop", "post_process"]

    def pre_process(state: State) -> WorkflowStep:
        print("pre_process")
        state.abs_repetitions = abs(state.y)
        return "add_loop"

    def add_loop(state: State) -> WorkflowStep | WorkflowReservedStepName:
        if state.abs_repetitions and state.abs_repetitions > 0:
            result = (state.result if state.result is not None else 0) + state.x
            abs_repetitions = (state.abs_repetitions if state.abs_repetitions is not None else 0) - 1
            print(f"add_loop: intermediate result {result}")
            state.abs_repetitions = abs_repetitions
            state.result = result
            return Workflow.SELF
        else:
            return "post_process"

    def post_process(state: State) -> WorkflowReservedStepName:
        print("post_process")
        if state.y < 0:
            result = -(state.result if state.result is not None else 0)
            state.result = result
        return Workflow.END

    try:
        multiplication_workflow = Workflow[State, WorkflowStep](name="MultiplicationWorkflow", schema=State)
        multiplication_workflow.add_step("pre_process", pre_process)
        multiplication_workflow.add_step("add_loop", add_loop)
        multiplication_workflow.add_step("post_process", post_process)

        response = await multiplication_workflow.run(State(x=8, y=5))
        print(f"result: {response.state.result}")

        response = await multiplication_workflow.run(State(x=8, y=-5))
        print(f"result: {response.state.result}")

    except WorkflowError as e:
        print(e)
    except ValidationError as e:
        print(e)


if __name__ == "__main__":
    asyncio.run(main())
