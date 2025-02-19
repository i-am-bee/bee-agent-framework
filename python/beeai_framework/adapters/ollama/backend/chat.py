# SPDX-License-Identifier: Apache-2.0

import os
from typing import Any

from beeai_framework.adapters.litellm.chat import LiteLLMChatModel
from beeai_framework.backend.constants import ProviderName
from beeai_framework.utils.custom_logger import BeeLogger

logger = BeeLogger(__name__)


class OllamaChatModel(LiteLLMChatModel):
    provider_id: ProviderName = "ollama"

    def __init__(self, model_id: str | None = None, **settings: Any) -> None:
        self._model_id = model_id if model_id else os.getenv("OLLAMA_CHAT_MODEL", "llama3.1:8b")
        self.settings = {"base_url": "http://localhost:11434"} | settings
        super().__init__()
