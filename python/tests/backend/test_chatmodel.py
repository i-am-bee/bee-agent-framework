# Copyright 2025 IBM Corp.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from pydantic import BaseModel

from beeai_framework.adapters.ollama.backend.chat import OllamaChatModel
from beeai_framework.adapters.watsonx.backend.chat import WatsonxChatModel
from beeai_framework.backend.chat import (
    ChatModel,
    ChatModelInput,
    ChatModelOutput,
    ChatModelStructureInput,
    ChatModelStructureOutput,
)
from beeai_framework.backend.message import AssistantMessage, CustomMessage, Message, UserMessage
from beeai_framework.cancellation import AbortSignal
from beeai_framework.context import RunContext


class ReverseWordsDummyModel(ChatModel):
    """Dummy model that simply reverses every word in a UserMessages"""

    model_id = "reversed_words_model"
    provider_id = "reversed_words_model"

    def reverse_message_words(self, messages: list[str]) -> str:
        reversed_words_messages = []
        for message in messages:
            if isinstance(message, UserMessage):
                reversed_words = " ".join(word[::-1] for word in message.text.split())
                reversed_words_messages.append(reversed_words)
        return reversed_words_messages

    async def _create(self, input: ChatModelInput, _: RunContext) -> ChatModelOutput:
        reversed_words_messages = self.reverse_message_words(input.messages)
        return ChatModelOutput(messages=[AssistantMessage(w) for w in reversed_words_messages])

    async def _create_stream(self, input: ChatModelInput, context: RunContext) -> AsyncGenerator[ChatModelOutput]:
        words = self.reverse_message_words(input.messages)[0].split(" ")

        last = len(words) - 1
        for count, chunk in enumerate(words):
            if context.signal.aborted:
                break
            await asyncio.sleep(3)
            yield ChatModelOutput(messages=[AssistantMessage(f"{chunk} " if count != last else chunk)])

    async def _create_structure(self, input: ChatModelStructureInput, run: RunContext) -> ChatModelStructureOutput:
        reversed_words_messages = self.reverse_message_words(input.messages)
        response_object = {"reversed": "".join(reversed_words_messages)}
        return ChatModelStructureOutput(object=response_object)


@pytest_asyncio.fixture
def reverse_words_chat() -> ChatModel:
    return ReverseWordsDummyModel()


@pytest.fixture
def chat_messages_list() -> list[Message]:
    user_message = UserMessage("tell me something interesting")
    custom_message = CustomMessage(role="custom", content="this is a custom message")
    return [user_message, custom_message]


@pytest.mark.asyncio
@pytest.mark.unit
async def test_chat_model_create(reverse_words_chat: ChatModel, chat_messages_list: list[Message]) -> None:
    response = await reverse_words_chat.create({"messages": chat_messages_list})

    assert len(response.messages) == 1
    assert all(isinstance(message, AssistantMessage) for message in response.messages)
    assert response.messages[0].get_texts()[0].get("text") == "llet em gnihtemos gnitseretni"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_chat_model_structure(reverse_words_chat: ChatModel, chat_messages_list: list[Message]) -> None:
    class ReverseWordsSchema(BaseModel):
        reversed: str

    reverse_words_chat = ReverseWordsDummyModel()
    response = await reverse_words_chat.create_structure(
        {
            "schema": ReverseWordsSchema,
            "messages": chat_messages_list,
        }
    )

    ReverseWordsSchema.model_validate(response.object)


@pytest.mark.asyncio
@pytest.mark.unit
async def test_chat_model_stream(reverse_words_chat: ChatModel, chat_messages_list: list[Message]) -> None:
    response = await reverse_words_chat.create({"messages": chat_messages_list, "stream": True})

    assert len(response.messages) == 4
    assert all(isinstance(message, AssistantMessage) for message in response.messages)
    assert "".join([m.get_texts()[0].get("text") for m in response.messages]) == "llet em gnihtemos gnitseretni"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_chat_model_abort(reverse_words_chat: ChatModel, chat_messages_list: list[Message]) -> None:
    response = await reverse_words_chat.create(
        {"messages": chat_messages_list, "stream": True, "abort_signal": AbortSignal.timeout(5)}
    )

    # depending on when the abort occurs the response may be None or a subset of expected response
    if response is not None:
        assert len(response.messages) < 4
        assert all(isinstance(message, AssistantMessage) for message in response.messages)
        text = response.messages[0].get_texts()[0].get("text")
        print("Response returned:", text)
        assert "llet em gnihtemos gnitseretni".startswith(text)
    else:
        print("No response returned.")


@pytest.mark.asyncio
@pytest.mark.unit
async def test_chat_model_from() -> None:
    ollama_chat_model = await ChatModel.from_name("ollama:llama3.1")
    assert isinstance(ollama_chat_model, OllamaChatModel)

    watsonx_chat_model = await ChatModel.from_name("watsonx:ibm/granite-3-8b-instruct")
    assert isinstance(watsonx_chat_model, WatsonxChatModel)
