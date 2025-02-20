from collections.abc import Awaitable, Callable

from pydantic import BaseModel
from termcolor import colored

from beeai_framework.utils.models import ModelLike, to_model_optional


class ReaderOptions(BaseModel):
    fallback: str = ""
    input: str = "User 👤 : "
    allow_empty: bool = False


class ConsoleReader:
    def __init__(self, options: ModelLike[ReaderOptions] | None = None) -> None:
        options = to_model_optional(ReaderOptions, options) or ReaderOptions()
        self.fallback = options.fallback
        self.input = options.input
        self.allow_empty = options.allow_empty

    def print(self, role: str, data: str) -> None:
        print(colored(role, "red", attrs=["bold"]), data)

    def prompt(self) -> str:
        prompt: str = ""

        while not prompt:
            prompt = input(colored(self.input, "cyan", attrs=["bold"])).strip()

            prompt = prompt if prompt else self.fallback

            if not prompt and not self.allow_empty:
                print("Error: Empty prompt is not allowed. Please try again.")
                continue

        return prompt

    async def run(self, fn: Callable[[str], Awaitable[None]]) -> None:
        print("Interactive session has started. To escape, input 'q' and submit.")

        while True:
            try:
                prompt = input(colored(self.input, "cyan", attrs=["bold"])).strip()

                if prompt == "q":
                    break

                prompt = prompt if prompt else self.fallback

                if not prompt and not self.allow_empty:
                    print("Error: Empty prompt is not allowed. Please try again.")
                    continue

                await fn(prompt)

            except KeyboardInterrupt:
                break
