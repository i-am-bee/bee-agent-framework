# SPDX-License-Identifier: Apache-2.0

import os
from typing import Any

from beeai_framework.adapters.litellm.chat import LiteLLMChatModel
from beeai_framework.backend.constants import ProviderName
from beeai_framework.utils.custom_logger import BeeLogger

logger = BeeLogger(__name__)


class WatsonxChatModel(LiteLLMChatModel):
    provider_id: ProviderName = "watsonx"

    def __init__(self, model_id: str | None = None, **settings: Any) -> None:
        self._model_id = model_id if model_id else os.getenv("WATSONX_CHAT_MODEL", "ibm/granite-3-8b-instruct")
        self.settings = settings
        super().__init__()
