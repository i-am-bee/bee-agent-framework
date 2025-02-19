# SPDX-License-Identifier: Apache-2.0


from typing import Literal

from pydantic import BaseModel

ProviderName = Literal["ollama", "openai", "watsonx"]
ProviderHumanName = Literal["Ollama", "OpenAI", "watsonx"]


class ProviderDef(BaseModel):
    name: ProviderHumanName
    module: ProviderName
    aliases: list[str]


class ProviderModelDef(BaseModel):
    provider_id: str
    model_id: str | None = None
    provider_def: ProviderDef


BackendProviders = {
    "Ollama": ProviderDef(name="Ollama", module="ollama", aliases=[]),
    "OpenAI": ProviderDef(name="OpenAI", module="openai", aliases=["openai"]),
    "watsonx": ProviderDef(name="watsonx", module="watsonx", aliases=["watsonx", "ibm"]),
}
