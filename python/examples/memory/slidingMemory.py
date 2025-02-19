# SPDX-License-Identifier: Apache-2.0

import asyncio

from beeai_framework.backend import Message, Role
from beeai_framework.memory.sliding_memory import SlidingMemory, SlidingMemoryConfig


async def main() -> None:
    try:
        # Create sliding memory with size 3
        memory = SlidingMemory(
            SlidingMemoryConfig(
                size=3,
                handlers={"removal_selector": lambda messages: messages[0]},  # Remove oldest message
            )
        )

        # Add messages
        await memory.add(Message.of({"role": Role.SYSTEM, "text": "You are a helpful assistant."}))

        await memory.add(Message.of({"role": Role.USER, "text": "What is Python?"}))

        await memory.add(Message.of({"role": Role.ASSISTANT, "text": "Python is a programming language."}))

        # Adding a fourth message should trigger sliding window
        await memory.add(Message.of({"role": Role.USER, "text": "What about JavaScript?"}))

        # Print results
        print(f"Messages in memory: {len(memory.messages)}")  # Should print 3
        for msg in memory.messages:
            print(f"{msg.role}: {msg.text}")

    except Exception as e:
        print(f"An error occurred: {e!s}")
        import traceback

        print(traceback.format_exc())


if __name__ == "__main__":
    asyncio.run(main())
