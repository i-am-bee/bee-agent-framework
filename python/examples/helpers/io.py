# SPDX-License-Identifier: Apache-2.0


def prompt_input(default: str | None = None) -> str:
    prompt: str = ""

    while prompt == "":
        user_input = input("User 👤 : ").strip()
        if user_input:
            prompt = user_input
            break
        elif default:
            prompt = default
            print("Empty prompt is not allowed. Using example prompt:\n", default)
            break
        else:
            print("Error: Empty prompt is not allowed. Please try again.")

    return prompt
